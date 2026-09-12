import { Router } from "express";
import { z } from "zod";
import { JobStatus } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";

export const jobsRouter = Router();
jobsRouter.use(requireAuth);

// Field roles only see jobs they're assigned to; managers see everything.
jobsRouter.get("/", async (req, res) => {
  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const jobs = await prisma.job.findMany({
    where: isManager
      ? undefined
      : { assignments: { some: { userId: req.auth!.userId } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(jobs);
});

jobsRouter.get("/:id", async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { user: { select: { id: true, name: true, role: true } } } } },
  });
  if (!job) return res.status(404).json({ error: "Job not found" });

  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const isAssigned = job.assignments.some((a) => a.userId === req.auth!.userId);
  if (!isManager && !isAssigned) {
    return res.status(403).json({ error: "Not assigned to this job" });
  }
  res.json(job);
});

const jobSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  geofenceRadiusM: z.number().int().positive().optional(),
  status: z.nativeEnum(JobStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

jobsRouter.post("/", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const job = await prisma.job.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });
  res.status(201).json(job);
});

jobsRouter.patch("/:id", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = jobSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });
  res.json(job);
});

const assignSchema = z.object({ userId: z.string().uuid() });

jobsRouter.post("/:id/assignments", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const assignment = await prisma.jobAssignment.upsert({
    where: { jobId_userId: { jobId: req.params.id, userId: parsed.data.userId } },
    create: { jobId: req.params.id, userId: parsed.data.userId },
    update: {},
  });
  res.status(201).json(assignment);
});

jobsRouter.delete("/:id/assignments/:userId", requireRole(...MANAGER_ROLES), async (req, res) => {
  await prisma.jobAssignment.delete({
    where: { jobId_userId: { jobId: req.params.id, userId: req.params.userId } },
  });
  res.status(204).end();
});
