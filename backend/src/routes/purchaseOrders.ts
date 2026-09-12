import { Router } from "express";
import { z } from "zod";
import { BudgetCategory, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth, requireRole, MANAGER_ROLES } from "../middleware/auth";

// Purchase orders are manager-only: they feed the live budget-vs-actual report,
// which only the office/admin/owner dashboard shows.
export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(requireAuth, requireRole(...MANAGER_ROLES));

purchaseOrdersRouter.get("/", async (req, res) => {
  const { jobId, status } = req.query as Record<string, string | undefined>;
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      jobId: jobId || undefined,
      status: (status as PurchaseOrderStatus) || undefined,
    },
    include: { supplier: true, job: { select: { id: true, name: true } } },
    orderBy: { orderedAt: "desc" },
  });
  res.json(pos);
});

const poSchema = z.object({
  jobId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().min(1),
  poNumber: z.string().optional(),
  amount: z.coerce.number().positive(),
  budgetCategory: z.nativeEnum(BudgetCategory).optional(),
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  orderedAt: z.string().datetime().optional(),
  expectedDeliveryAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

purchaseOrdersRouter.post("/", async (req, res) => {
  const parsed = poSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;
  const po = await prisma.purchaseOrder.create({
    data: {
      ...data,
      orderedAt: data.orderedAt ? new Date(data.orderedAt) : undefined,
      expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : undefined,
      createdById: req.auth!.userId,
    },
  });
  res.status(201).json(po);
});

purchaseOrdersRouter.patch("/:id", async (req, res) => {
  const parsed = poSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: {
      ...data,
      orderedAt: data.orderedAt ? new Date(data.orderedAt) : undefined,
      expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : undefined,
      receivedAt: data.status === "received" ? new Date() : undefined,
    },
  });
  res.json(po);
});
