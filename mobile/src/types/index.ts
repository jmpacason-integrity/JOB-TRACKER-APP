// Kept in sync with backend/prisma/schema.prisma and packages/shared by hand,
// rather than importing @jobtracker/shared, to avoid Metro/pnpm symlink resolution issues.

export type UserRole = "owner" | "admin" | "office" | "field_worker" | "subcontractor";

export const MANAGER_ROLES: UserRole[] = ["owner", "admin", "office"];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hourlyRate?: number | null;
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
  clientEntryId: string;
}

export type ExpenseCategory =
  | "materials"
  | "fuel"
  | "tools_equipment"
  | "labour_subcontract"
  | "permits_fees"
  | "other";

export type PhotoCategory = "before" | "during" | "after" | "issue" | "other";

export interface Shift {
  id: string;
  jobId: string;
  userId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string | null;
  job?: { id: string; name: string; address?: string | null };
}
