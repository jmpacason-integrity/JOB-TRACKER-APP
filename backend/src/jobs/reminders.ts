import { prisma } from "../db";

// Sends push notifications via Expo's push service (works for both iOS and
// Android from one API since the mobile app is built with Expo).
async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  if (tokens.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, data }))),
  });
}

async function tokensForUser(userId: string): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  return tokens.map((t) => t.token);
}

async function tokensForRoles(roles: string[]): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({ where: { user: { role: { in: roles as any } } } });
  return tokens.map((t) => t.token);
}

const LONG_SHIFT_HOURS = 12;

// 1. Nudge anyone clocked in unusually long to clock out.
export async function sendClockOutReminders() {
  const cutoff = new Date(Date.now() - LONG_SHIFT_HOURS * 3_600_000);
  const openEntries = await prisma.timeEntry.findMany({
    where: { clockOutAt: null, clockInAt: { lte: cutoff } },
    include: { job: { select: { name: true } } },
  });
  for (const entry of openEntries) {
    const tokens = await tokensForUser(entry.userId);
    await sendExpoPush(
      tokens,
      "Still clocked in?",
      `You've been clocked in on ${entry.job.name} for over ${LONG_SHIFT_HOURS}h. Don't forget to clock out.`,
      { type: "clock_out_reminder", timeEntryId: entry.id },
    );
  }
}

// 2. Nudge workers with an active job assignment but nothing logged today.
export async function sendMissingDataNudges() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const activeAssignments = await prisma.jobAssignment.findMany({
    where: { job: { status: "active" } },
    include: { user: true, job: { select: { id: true, name: true } } },
  });

  for (const assignment of activeAssignments) {
    const loggedToday = await prisma.timeEntry.findFirst({
      where: { userId: assignment.userId, jobId: assignment.jobId, clockInAt: { gte: startOfDay } },
    });
    if (loggedToday) continue;

    const tokens = await tokensForUser(assignment.userId);
    await sendExpoPush(
      tokens,
      "Nothing logged today",
      `No hours logged yet for ${assignment.job.name} today.`,
      { type: "missing_data", jobId: assignment.jobId },
    );
  }
}

// 3. Tell office/admin/owner when new submissions are waiting for review.
export async function sendApprovalReminders() {
  const [pendingTime, pendingExpenses] = await Promise.all([
    prisma.timeEntry.count({ where: { status: "pending" } }),
    prisma.expense.count({ where: { status: "pending" } }),
  ]);
  const totalPending = pendingTime + pendingExpenses;
  if (totalPending === 0) return;

  const tokens = await tokensForRoles(["owner", "admin", "office"]);
  await sendExpoPush(
    tokens,
    "Approvals waiting",
    `${totalPending} submission${totalPending === 1 ? "" : "s"} waiting for review.`,
    { type: "approval_needed" },
  );
}

// 4. Remind on job start/end dates coming up in the next 24h.
export async function sendJobDeadlineReminders() {
  const in24h = new Date(Date.now() + 24 * 3_600_000);
  const upcoming = await prisma.job.findMany({
    where: {
      OR: [{ startDate: { gte: new Date(), lte: in24h } }, { endDate: { gte: new Date(), lte: in24h } }],
    },
    include: { assignments: true },
  });

  for (const job of upcoming) {
    const label = job.endDate && job.endDate <= in24h ? "wraps up" : "starts";
    for (const assignment of job.assignments) {
      const tokens = await tokensForUser(assignment.userId);
      await sendExpoPush(tokens, "Upcoming job milestone", `${job.name} ${label} within 24 hours.`, {
        type: "job_deadline",
        jobId: job.id,
      });
    }
    const managerTokens = await tokensForRoles(["owner", "admin", "office"]);
    await sendExpoPush(managerTokens, "Upcoming job milestone", `${job.name} ${label} within 24 hours.`, {
      type: "job_deadline",
      jobId: job.id,
    });
  }
}

export async function runAllReminderChecks() {
  await Promise.all([
    sendClockOutReminders(),
    sendMissingDataNudges(),
    sendApprovalReminders(),
    sendJobDeadlineReminders(),
  ]);
}
