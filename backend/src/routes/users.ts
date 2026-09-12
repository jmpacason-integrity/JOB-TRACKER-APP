import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  hourlyRate: true,
  active: true,
  createdAt: true,
};

// Any authenticated user can see their own profile.
usersRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: userSelect,
  });
  res.json(user);
});

// Manager tier can list/manage the team.
usersRouter.get("/", requireRole(...MANAGER_ROLES), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { name: "asc" },
  });
  res.json(users);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  hourlyRate: z.number().positive().optional(),
});

usersRouter.post("/", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, name, phone, role, hourlyRate } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone, role, hourlyRate },
    select: userSelect,
  });
  res.status(201).json(user);
});

const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({ active: z.boolean().optional() });

usersRouter.patch("/:id", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: userSelect,
  });
  res.json(user);
});
