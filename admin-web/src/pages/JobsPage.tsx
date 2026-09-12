import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Job, JobStatus } from "../types";

const STATUS_OPTIONS: JobStatus[] = ["planned", "active", "on_hold", "completed", "cancelled"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get<Job[]>("/jobs").then(setJobs).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/jobs", {
        name,
        clientName: clientName || undefined,
        address: address || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      });
      setName("");
      setClientName("");
      setAddress("");
      setLat("");
      setLng("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card-row">
        <div>
          <h1>Jobs</h1>
          <p className="page-subtitle">All active and past projects</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Job"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card" onSubmit={createJob}>
          <div className="grid grid-2">
            <div className="field">
              <label>Job name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Client</label>
              <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="field">
              <label>Site address</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="field" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>Latitude</label>
                <input className="input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-37.8136" />
              </div>
              <div style={{ flex: 1 }}>
                <label>Longitude</label>
                <input className="input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="144.9631" />
              </div>
            </div>
          </div>
          <p className="page-subtitle" style={{ margin: "4px 0 12px" }}>
            Site coordinates power geofenced clock-in and the weather forecast for this job.
          </p>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Job"}
          </button>
        </form>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs
              .filter((job) => statusFilter === "all" || job.status === statusFilter)
              .map((job) => (
              <tr key={job.id}>
                <td>
                  <Link to={`/jobs/${job.id}`}>{job.name}</Link>
                  {job.address && <div className="page-subtitle" style={{ margin: 0 }}>{job.address}</div>}
                </td>
                <td>{job.clientName || "—"}</td>
                <td>
                  <span className={`badge badge-${job.status === "active" ? "active" : "pending"}`}>
                    {job.status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <Link to={`/jobs/${job.id}`} className="btn btn-secondary btn-sm">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
