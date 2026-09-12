import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import type { User, UserRole } from "../types";

const ROLES: UserRole[] = ["owner", "admin", "office", "field_worker", "subcontractor"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("field_worker");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get<User[]>("/users").then(setUsers);

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/users", {
        name,
        email,
        password,
        role,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });
      setName("");
      setEmail("");
      setPassword("");
      setHourlyRate("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: User) => {
    await api.patch(`/users/${user.id}`, { active: !user.active });
    load();
  };

  return (
    <div>
      <div className="card-row">
        <div>
          <h1>Team</h1>
          <p className="page-subtitle">Everyone with an account, field and office alike</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New Person"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={create}>
          <div className="grid grid-2">
            <div className="field">
              <label>Full name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Hourly rate (for labour cost tracking)</label>
              <input className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="45" />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Account"}
          </button>
        </form>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: "capitalize" }}>{u.role.replace("_", " ")}</td>
                <td>{u.hourlyRate ? `$${u.hourlyRate}/hr` : "—"}</td>
                <td>
                  <span className={`badge ${u.active ? "badge-approved" : "badge-rejected"}`}>
                    {u.active ? "active" : "disabled"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(u)}>
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
