import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";

export const scheduleRouter = Router();
scheduleRouter.use(requireAuth);

// Field roles see only their own shifts; managers can filter by job/user or see all.
scheduleRouter.get("/", async (req, res) => {
  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const { jobId, from, to } = req.query as Record<string, string | undefined>;

  const shifts = await prisma.shift.findMany({
    where: {
      userId: isManager ? undefined : req.auth!.userId,
      jobId: jobId || undefined,
      scheduledStart: from ? { gte: new Date(from) } : undefined,
      scheduledEnd: to ? { lte: new Date(to) } : undefined,
    },
    include: {
      job: { select: { id: true, name: true, address: true } },
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });
  res.json(shifts);
});

const shiftSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  notes: z.string().optional(),
});

scheduleRouter.post("/", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = shiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const shift = await prisma.shift.create({
    data: {
      ...parsed.data,
      scheduledStart: new Date(parsed.data.scheduledStart),
      scheduledEnd: new Date(parsed.data.scheduledEnd),
    },
  });
  res.status(201).json(shift);
});

scheduleRouter.patch("/:id", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = shiftSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : undefined,
      scheduledEnd: parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : undefined,
    },
  });
  res.json(shift);
});

scheduleRouter.delete("/:id", requireRole(...MANAGER_ROLES), async (req, res) => {
  await prisma.shift.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
