import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Job, PurchaseOrder, PurchaseOrderStatus } from "../types";

const STATUSES: PurchaseOrderStatus[] = ["ordered", "partially_received", "received", "invoiced", "cancelled"];

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");

  useEffect(() => {
    api.get<PurchaseOrder[]>("/purchase-orders").then(setPos);
    api.get<Job[]>("/jobs").then(setJobs);
  }, []);

  const jobName = (id: string) => jobs.find((j) => j.id === id)?.name || "—";
  const filtered = pos.filter((po) => statusFilter === "all" || po.status === statusFilter);
  const outstandingTotal = filtered
    .filter((po) => po.status !== "cancelled" && po.status !== "invoiced")
    .reduce((sum, po) => sum + Number(po.amount), 0);

  return (
    <div>
      <div className="card-row">
        <div>
          <h1>Purchase Orders</h1>
          <p className="page-subtitle">Every order across all jobs, feeding live budget-vs-actual</p>
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "all")} style={{ width: 200 }}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="page-subtitle" style={{ margin: 0 }}>Outstanding (not yet invoiced/cancelled)</div>
        <h1>${outstandingTotal.toLocaleString()}</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Supplier</th>
              <th>PO #</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((po) => (
              <tr key={po.id}>
                <td><Link to={`/jobs/${po.jobId}`}>{jobName(po.jobId)}</Link></td>
                <td>{po.supplierName}</td>
                <td>{po.poNumber || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{po.budgetCategory}</td>
                <td>${Number(po.amount).toFixed(2)}</td>
                <td style={{ textTransform: "capitalize" }}>{po.status.replace("_", " ")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">No purchase orders match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
