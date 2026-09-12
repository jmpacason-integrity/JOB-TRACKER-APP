// Shared types/constants used by backend, admin-web, and mobile.
// Keep this dependency-free (no runtime imports) so every workspace can consume it directly.

export type UserRole = "owner" | "admin" | "office" | "field_worker" | "subcontractor";

// Roles that get the manager/admin web dashboard + approval rights.
export const MANAGER_ROLES: UserRole[] = ["owner", "admin", "office"];
// Roles that primarily use the mobile app to submit data.
export const FIELD_ROLES: UserRole[] = ["field_worker", "subcontractor"];

export type JobStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ExpenseCategory =
  | "materials"
  | "fuel"
  | "tools_equipment"
  | "labour_subcontract"
  | "permits_fees"
  | "other";

export type PhotoCategory = "before" | "during" | "after" | "issue" | "other";

export type PurchaseOrderStatus =
  | "ordered"
  | "partially_received"
  | "received"
  | "invoiced"
  | "cancelled";

export type TimeEntrySource = "geofence_auto" | "manual" | "admin_adjusted";

export type BudgetCategory = "labour" | "materials" | "subcontractors" | "equipment" | "other";

export interface JobBudgetSummary {
  jobId: string;
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  variance: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// Default radius (metres) used to detect arrival/departure at a job site for geofenced clock-in.
export const DEFAULT_GEOFENCE_RADIUS_M = 150;
