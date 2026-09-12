import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Job, Shift, User } from "../types";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulePage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [jobId, setJobId] = useState("");
  const [userId, setUserId] = useState("");
  const now = new Date();
  const [start, setStart] = useState(toLocalInputValue(now));
  const [end, setEnd] = useState(toLocalInputValue(new Date(now.getTime() + 8 * 3_600_000)));

  const load = () => api.get<Shift[]>("/schedule").then(setShifts);

  useEffect(() => {
    load();
    api.get<Job[]>("/jobs").then(setJobs);
    api.get<User[]>("/users").then(setUsers);
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !userId) return;
    await api.post("/schedule", {
      jobId,
      userId,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(end).toISOString(),
    });
    setShowForm(false);
    load();
  };

  const upcoming = [...shifts].sort(
    (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
  );

  return (
    <div>
      <div className="card-row">
        <div>
          <h1>Schedule</h1>
          <p className="page-subtitle">Who's assigned where, and when</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New Shift"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={create}>
          <div className="grid grid-2">
            <div className="field">
              <label>Job</label>
              <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)} required>
                <option value="">Select job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Team member</label>
              <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select person…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Start</label>
              <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="field">
              <label>End</label>
              <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <button className="btn" type="submit">Create Shift</button>
        </form>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Person</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id}>
                <td>{s.job.name}</td>
                <td>{s.user.name}</td>
                <td>{new Date(s.scheduledStart).toLocaleString()}</td>
                <td>{new Date(s.scheduledEnd).toLocaleString()}</td>
              </tr>
            ))}
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">No shifts scheduled.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
