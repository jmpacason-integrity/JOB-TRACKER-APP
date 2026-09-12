import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import type { BudgetCategory, BudgetSummary, Job, Photo, PurchaseOrder, User } from "../types";

const TABS = ["Budget", "Purchase Orders", "Photos", "Team"] as const;
type Tab = (typeof TABS)[number];

const BUDGET_CATEGORIES: BudgetCategory[] = ["labour", "materials", "subcontractors", "equipment", "other"];

function currency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function BudgetTab({ jobId }: { jobId: string }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<BudgetSummary>(`/budgets/${jobId}`).then((s) => {
      setSummary(s);
      setDrafts(Object.fromEntries(s.categories.map((c) => [c.category, String(c.budgeted)])));
    });

  useEffect(() => {
    load();
  }, [jobId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/budgets/${jobId}`, {
        lines: BUDGET_CATEGORIES.map((category) => ({
          category,
          budgetedAmount: Number(drafts[category] || 0),
        })),
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!summary) return <p className="page-subtitle">Loading budget…</p>;

  const overBudget = summary.totals.variance < 0;

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="page-subtitle" style={{ margin: 0 }}>Budgeted</div>
          <h1>{currency(summary.totals.budgeted)}</h1>
        </div>
        <div className="card">
          <div className="page-subtitle" style={{ margin: 0 }}>Actual (live)</div>
          <h1>{currency(summary.totals.actual)}</h1>
        </div>
        <div className="card">
          <div className="page-subtitle" style={{ margin: 0 }}>Variance</div>
          <h1 style={{ color: overBudget ? "var(--danger)" : "var(--success)" }}>
            {currency(summary.totals.variance)}
          </h1>
        </div>
      </div>

      <div className="card">
        <h2>By category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Variance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summary.categories.map((c) => {
              const pct = c.budgeted > 0 ? Math.min(100, (c.actual / c.budgeted) * 100) : c.actual > 0 ? 100 : 0;
              const over = c.actual > c.budgeted && c.budgeted > 0;
              return (
                <tr key={c.category}>
                  <td style={{ textTransform: "capitalize" }}>{c.category}</td>
                  <td>
                    <input
                      className="input"
                      style={{ width: 110 }}
                      value={drafts[c.category] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.category]: e.target.value }))}
                    />
                  </td>
                  <td>{currency(c.actual)}</td>
                  <td style={{ color: c.variance < 0 ? "var(--danger)" : "var(--text)" }}>
                    {currency(c.variance)}
                  </td>
                  <td style={{ width: 140 }}>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${pct}%`, background: over ? "var(--danger)" : "var(--accent)" }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Budget"}
        </button>
      </div>
    </div>
  );
}

function PurchaseOrdersTab({ jobId }: { jobId: string }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("materials");

  const load = () => api.get<PurchaseOrder[]>(`/purchase-orders?jobId=${jobId}`).then(setPos);

  useEffect(() => {
    load();
  }, [jobId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/purchase-orders", {
      jobId,
      supplierName,
      amount: Number(amount),
      poNumber: poNumber || undefined,
      budgetCategory: category,
    });
    setSupplierName("");
    setAmount("");
    setPoNumber("");
    setShowForm(false);
    load();
  };

  const setStatus = async (id: string, status: PurchaseOrder["status"]) => {
    await api.patch(`/purchase-orders/${id}`, { status });
    load();
  };

  return (
    <div>
      <div className="card-row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Purchase orders</h2>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New PO"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={create}>
          <div className="grid grid-2">
            <div className="field">
              <label>Supplier</label>
              <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Amount</label>
              <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="field">
              <label>PO number (optional)</label>
              <input className="input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div className="field">
              <label>Budget category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)}>
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn" type="submit">Create PO</button>
        </form>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>PO #</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => (
              <tr key={po.id}>
                <td>{po.supplierName}</td>
                <td>{po.poNumber || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{po.budgetCategory}</td>
                <td>{currency(Number(po.amount))}</td>
                <td style={{ textTransform: "capitalize" }}>{po.status.replace("_", " ")}</td>
                <td>
                  <select
                    className="input"
                    style={{ padding: "4px 8px" }}
                    value={po.status}
                    onChange={(e) => setStatus(po.id, e.target.value as PurchaseOrder["status"])}
                  >
                    <option value="ordered">Ordered</option>
                    <option value="partially_received">Partially received</option>
                    <option value="received">Received</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">No purchase orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhotosTab({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    api.get<Photo[]>(`/photos?jobId=${jobId}`).then(setPhotos);
  }, [jobId]);

  const grouped = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  if (photos.length === 0) return <p className="empty-state">No photos uploaded for this job yet.</p>;

  return (
    <div>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <h2 style={{ textTransform: "capitalize" }}>{category}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {items.map((p) => (
              <div key={p.id} style={{ width: 160 }}>
                <img
                  src={p.url}
                  alt={p.caption || category}
                  style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
                />
                <div className="page-subtitle" style={{ margin: "4px 0 0" }}>
                  {p.user.name} · {new Date(p.takenAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamTab({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<(Job & { assignments: { user: User }[] }) | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const load = async () => {
    const [j, allUsers] = await Promise.all([
      api.get<Job & { assignments: { user: User }[] }>(`/jobs/${jobId}`),
      api.get<User[]>("/users"),
    ]);
    setJob(j);
    setUsers(allUsers);
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const assign = async () => {
    if (!selectedUserId) return;
    await api.post(`/jobs/${jobId}/assignments`, { userId: selectedUserId });
    setSelectedUserId("");
    load();
  };

  const unassign = async (userId: string) => {
    await api.delete(`/jobs/${jobId}/assignments/${userId}`);
    load();
  };

  if (!job) return <p className="page-subtitle">Loading team…</p>;

  const assignedIds = new Set(job.assignments.map((a) => a.user.id));
  const available = users.filter((u) => !assignedIds.has(u.id));

  return (
    <div>
      <div className="card">
        <h2>Assigned to this job</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {job.assignments.map((a) => (
              <tr key={a.user.id}>
                <td>{a.user.name}</td>
                <td style={{ textTransform: "capitalize" }}>{a.user.role.replace("_", " ")}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => unassign(a.user.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {job.assignments.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">Nobody assigned yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Assign someone</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="input" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Select team member…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.replace("_", " ")})
              </option>
            ))}
          </select>
          <button className="btn" onClick={assign} disabled={!selectedUserId}>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [tab, setTab] = useState<Tab>("Budget");

  useEffect(() => {
    if (jobId) api.get<Job>(`/jobs/${jobId}`).then(setJob);
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div>
      <h1>{job?.name || "Job"}</h1>
      <p className="page-subtitle">{job?.address}</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Budget" && <BudgetTab jobId={jobId} />}
      {tab === "Purchase Orders" && <PurchaseOrdersTab jobId={jobId} />}
      {tab === "Photos" && <PhotosTab jobId={jobId} />}
      {tab === "Team" && <TeamTab jobId={jobId} />}
    </div>
  );
}
