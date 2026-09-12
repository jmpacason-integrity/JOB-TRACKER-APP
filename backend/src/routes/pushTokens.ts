import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export const pushTokensRouter = Router();
pushTokensRouter.use(requireAuth);

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

// Mobile app calls this after requesting notification permission, so the
// reminder scheduler (see src/jobs/reminders.ts) knows where to push to.
pushTokensRouter.post("/", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const token = await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    create: { ...parsed.data, userId: req.auth!.userId },
    update: { userId: req.auth!.userId, platform: parsed.data.platform },
  });
  res.status(201).json(token);
});

pushTokensRouter.delete("/:token", async (req, res) => {
  await prisma.pushToken.deleteMany({ where: { token: req.params.token, userId: req.auth!.userId } });
  res.status(204).end();
});
