import { Router } from "express";
import { z } from "zod";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";
import { isWithinGeofence } from "../utils/geo";

export const timeEntriesRouter = Router();
timeEntriesRouter.use(requireAuth);

timeEntriesRouter.get("/", async (req, res) => {
  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const { jobId, userId, status } = req.query as Record<string, string | undefined>;

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: isManager ? userId || undefined : req.auth!.userId,
      jobId: jobId || undefined,
      status: (status as ApprovalStatus) || undefined,
    },
    include: {
      job: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { clockInAt: "desc" },
  });
  res.json(entries);
});

// Clock-in. Idempotent on clientEntryId so an offline device can safely retry
// the same action once connectivity returns without creating duplicates.
const clockInSchema = z.object({
  jobId: z.string().uuid(),
  clientEntryId: z.string().min(1),
  clockInAt: z.string().datetime(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

timeEntriesRouter.post("/", async (req, res) => {
  const parsed = clockInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { jobId, clientEntryId, clockInAt, lat, lng } = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return res.status(404).json({ error: "Job not found" });

  let source: "geofence_auto" | "manual" = "manual";
  if (job.lat != null && job.lng != null && lat != null && lng != null) {
    source = isWithinGeofence(lat, lng, job.lat, job.lng, job.geofenceRadiusM)
      ? "geofence_auto"
      : "manual";
  }

  const entry = await prisma.timeEntry.upsert({
    where: { clientEntryId },
    create: {
      jobId,
      userId: req.auth!.userId,
      clientEntryId,
      clockInAt: new Date(clockInAt),
      clockInLat: lat,
      clockInLng: lng,
      source,
    },
    update: {},
  });
  res.status(201).json(entry);
});

const clockOutSchema = z.object({
  clockOutAt: z.string().datetime(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

timeEntriesRouter.patch("/by-client/:clientEntryId/clock-out", async (req, res) => {
  const parsed = clockOutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await prisma.timeEntry.findUnique({
    where: { clientEntryId: req.params.clientEntryId },
  });
  if (!existing) return res.status(404).json({ error: "Time entry not found" });
  if (existing.userId !== req.auth!.userId && !MANAGER_ROLES.includes(req.auth!.role)) {
    return res.status(403).json({ error: "Not your time entry" });
  }

  const entry = await prisma.timeEntry.update({
    where: { clientEntryId: req.params.clientEntryId },
    data: {
      clockOutAt: new Date(parsed.data.clockOutAt),
      clockOutLat: parsed.data.lat,
      clockOutLng: parsed.data.lng,
    },
  });
  res.json(entry);
});

const approveSchema = z.object({ status: z.enum(["approved", "rejected"]) });

timeEntriesRouter.patch("/:id/approval", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      approvedById: req.auth!.userId,
      approvedAt: new Date(),
    },
  });
  res.json(entry);
});
