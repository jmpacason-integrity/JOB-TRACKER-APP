import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Expense, TimeEntry } from "../types";

function hoursBetween(start: string, end?: string | null): string {
  if (!end) return "in progress";
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return `${hrs.toFixed(1)}h`;
}

export default function ApprovalsPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = useCallback(async () => {
    const [t, e] = await Promise.all([
      api.get<TimeEntry[]>("/time-entries?status=pending"),
      api.get<Expense[]>("/expenses?status=pending"),
    ]);
    setTimeEntries(t);
    setExpenses(e);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decideTime = async (id: string, status: "approved" | "rejected") => {
    await api.patch(`/time-entries/${id}/approval`, { status });
    load();
  };
  const decideExpense = async (id: string, status: "approved" | "rejected") => {
    await api.patch(`/expenses/${id}/approval`, { status });
    load();
  };

  return (
    <div>
      <h1>Approvals</h1>
      <p className="page-subtitle">Review submissions from the field before they count as actual cost.</p>

      <div className="card">
        <h2>Time entries ({timeEntries.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Job</th>
              <th>Clock in</th>
              <th>Duration</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((t) => (
              <tr key={t.id}>
                <td>{t.user.name}</td>
                <td>{t.job.name}</td>
                <td>{new Date(t.clockInAt).toLocaleString()}</td>
                <td>{hoursBetween(t.clockInAt, t.clockOutAt)}</td>
                <td>{t.source === "geofence_auto" ? "On-site" : "Manual"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-success btn-sm" onClick={() => decideTime(t.id, "approved")}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => decideTime(t.id, "rejected")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {timeEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nothing pending.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Expenses ({expenses.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Job</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Receipt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.user.name}</td>
                <td>{e.job.name}</td>
                <td style={{ textTransform: "capitalize" }}>{e.category.replace("_", " ")}</td>
                <td>${Number(e.amount).toFixed(2)}</td>
                <td>
                  {e.receiptPhotoUrl ? (
                    <a href={e.receiptPhotoUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-success btn-sm" onClick={() => decideExpense(e.id, "approved")}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => decideExpense(e.id, "rejected")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nothing pending.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
