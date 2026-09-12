import { Router } from "express";
import { z } from "zod";
import { ApprovalStatus, ExpenseCategory } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";
import { upload, uploadedFileUrl } from "../middleware/upload";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get("/", async (req, res) => {
  const isManager = MANAGER_ROLES.includes(req.auth!.role);
  const { jobId, userId, status } = req.query as Record<string, string | undefined>;

  const expenses = await prisma.expense.findMany({
    where: {
      userId: isManager ? userId || undefined : req.auth!.userId,
      jobId: jobId || undefined,
      status: (status as ApprovalStatus) || undefined,
    },
    include: {
      job: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { spentAt: "desc" },
  });
  res.json(expenses);
});

// Receipt photo is optional at capture time (upload can complete once back online);
// clientEntryId keeps offline retries idempotent, same pattern as time entries.
const createExpenseSchema = z.object({
  jobId: z.string().uuid(),
  clientEntryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().optional(),
  spentAt: z.string().datetime(),
});

expensesRouter.post("/", upload.single("receipt"), async (req, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { jobId, clientEntryId, amount, category, description, spentAt } = parsed.data;

  const expense = await prisma.expense.upsert({
    where: { clientEntryId },
    create: {
      jobId,
      userId: req.auth!.userId,
      clientEntryId,
      amount,
      category,
      description,
      spentAt: new Date(spentAt),
      receiptPhotoUrl: req.file ? uploadedFileUrl(req.file.filename) : undefined,
    },
    update: req.file ? { receiptPhotoUrl: uploadedFileUrl(req.file.filename) } : {},
  });
  res.status(201).json(expense);
});

const approveSchema = z.object({ status: z.enum(["approved", "rejected"]) });

expensesRouter.patch("/:id/approval", requireRole(...MANAGER_ROLES), async (req, res) => {
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      approvedById: req.auth!.userId,
      approvedAt: new Date(),
    },
  });
  res.json(expense);
});
