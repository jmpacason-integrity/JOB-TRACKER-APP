export type UserRole = "owner" | "admin" | "office" | "field_worker" | "subcontractor";
export const MANAGER_ROLES: UserRole[] = ["owner", "admin", "office"];

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  hourlyRate?: number | null;
  active: boolean;
}

export type JobStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";

export interface Job {
  id: string;
  name: string;
  clientName?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  geofenceRadiusM: number;
  status: JobStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface TimeEntry {
  id: string;
  jobId: string;
  userId: string;
  clockInAt: string;
  clockOutAt?: string | null;
  status: ApprovalStatus;
  source: string;
  job: { id: string; name: string };
  user: { id: string; name: string };
}

export type ExpenseCategory =
  | "materials"
  | "fuel"
  | "tools_equipment"
  | "labour_subcontract"
  | "permits_fees"
  | "other";

export interface Expense {
  id: string;
  jobId: string;
  userId: string;
  amount: string;
  category: ExpenseCategory;
  description?: string | null;
  receiptPhotoUrl?: string | null;
  spentAt: string;
  status: ApprovalStatus;
  job: { id: string; name: string };
  user: { id: string; name: string };
}

export type PhotoCategory = "before" | "during" | "after" | "issue" | "other";

export interface Photo {
  id: string;
  jobId: string;
  url: string;
  category: PhotoCategory;
  caption?: string | null;
  takenAt: string;
  user: { id: string; name: string };
}

export type PurchaseOrderStatus = "ordered" | "partially_received" | "received" | "invoiced" | "cancelled";
export type BudgetCategory = "labour" | "materials" | "subcontractors" | "equipment" | "other";

export interface PurchaseOrder {
  id: string;
  jobId: string;
  supplierName: string;
  poNumber?: string | null;
  amount: string;
  budgetCategory: BudgetCategory;
  status: PurchaseOrderStatus;
  orderedAt: string;
  expectedDeliveryAt?: string | null;
  notes?: string | null;
}

export interface BudgetCategorySummary {
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  variance: number;
}

export interface BudgetSummary {
  jobId: string;
  categories: BudgetCategorySummary[];
  totals: { budgeted: number; actual: number; variance: number };
}

export interface Shift {
  id: string;
  jobId: string;
  userId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string | null;
  job: { id: string; name: string };
  user: { id: string; name: string };
}
