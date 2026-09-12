import { Router } from "express";
import { z } from "zod";
import { BudgetCategory } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";

// Live budget-vs-actual is manager-only: it's the core "backend manager view"
// the mobile app feeds into by having field workers log hours/expenses/photos.
export const budgetsRouter = Router();
budgetsRouter.use(requireAuth, requireRole(...MANAGER_ROLES));

const EXPENSE_CATEGORY_TO_BUDGET: Record<string, BudgetCategory> = {
  materials: "materials",
  fuel: "other",
  tools_equipment: "equipment",
  labour_subcontract: "subcontractors",
  permits_fees: "other",
  other: "other",
};

budgetsRouter.get("/:jobId", async (req, res) => {
  const jobId = req.params.jobId;

  const [budgetLines, timeEntries, expenses, purchaseOrders] = await Promise.all([
    prisma.budgetLine.findMany({ where: { jobId } }),
    prisma.timeEntry.findMany({
      where: { jobId, status: { not: "rejected" } },
      include: { user: { select: { hourlyRate: true } } },
    }),
    prisma.expense.findMany({ where: { jobId, status: { not: "rejected" } } }),
    prisma.purchaseOrder.findMany({ where: { jobId, status: { not: "cancelled" } } }),
  ]);

  const actualByCategory: Record<BudgetCategory, number> = {
    labour: 0,
    materials: 0,
    subcontractors: 0,
    equipment: 0,
    other: 0,
  };

  for (const entry of timeEntries) {
    if (!entry.clockOutAt) continue; // still clocked in; not yet a completed cost
    const hours = (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 3_600_000;
    const rate = entry.user.hourlyRate ? Number(entry.user.hourlyRate) : 0;
    actualByCategory.labour += hours * rate;
  }

  for (const expense of expenses) {
    const category = EXPENSE_CATEGORY_TO_BUDGET[expense.category] ?? "other";
    actualByCategory[category] += Number(expense.amount);
  }

  for (const po of purchaseOrders) {
    actualByCategory[po.budgetCategory] += Number(po.amount);
  }

  const categories: BudgetCategory[] = ["labour", "materials", "subcontractors", "equipment", "other"];
  const summary = categories.map((category) => {
    const line = budgetLines.find((b) => b.category === category);
    const budgeted = line ? Number(line.budgetedAmount) : 0;
    const actual = actualByCategory[category];
    return { category, budgeted, actual, variance: budgeted - actual };
  });

  const totals = summary.reduce(
    (acc, s) => ({
      budgeted: acc.budgeted + s.budgeted,
      actual: acc.actual + s.actual,
      variance: acc.variance + s.variance,
    }),
    { budgeted: 0, actual: 0, variance: 0 },
  );

  res.json({ jobId, categories: summary, totals });
});

const setBudgetSchema = z.object({
  lines: z.array(
    z.object({
      category: z.nativeEnum(BudgetCategory),
      budgetedAmount: z.coerce.number().nonnegative(),
    }),
  ),
});

budgetsRouter.put("/:jobId", async (req, res) => {
  const parsed = setBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const jobId = req.params.jobId;

  await prisma.$transaction(
    parsed.data.lines.map((line) =>
      prisma.budgetLine.upsert({
        where: { jobId_category: { jobId, category: line.category } },
        create: { jobId, category: line.category, budgetedAmount: line.budgetedAmount },
        update: { budgetedAmount: line.budgetedAmount },
      }),
    ),
  );

  const lines = await prisma.budgetLine.findMany({ where: { jobId } });
  res.json(lines);
});
