"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "./admin-content";
type Stats = {
  today: number;
  last_7_days: number;
  last_30_days: number;
  total: number;
  timezone: string;
  daily: { day: string; visits: number }[];
};
export default function VisitStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setStats(await adminRequest<Stats>("analytics/visits"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load visit statistics",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const max = Math.max(1, ...(stats?.daily.map((d) => d.visits) || []));
  return (
    <section className="admin-data-panel admin-visit-stats">
      <div className="admin-panel-heading">
        <div>
          <h2>Website visits</h2>
          <p>One visit per IP per calendar day · Europe/Madrid</p>
        </div>
        <button type="button" disabled={loading} onClick={load}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-stats">
        {(
          [
            ["Today", stats?.today],
            ["Last 7 days", stats?.last_7_days],
            ["Last 30 days", stats?.last_30_days],
            ["Total daily unique visits", stats?.total],
          ] as const
        ).map(([label, count]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>
              {count === undefined ? "—" : count.toLocaleString("en-GB")}
            </strong>
          </div>
        ))}
      </div>
      {stats && (
        <div
          className="admin-visits-chart"
          role="list"
          aria-label="Daily visits for the last 30 days"
        >
          {stats.daily.map((day) => (
            <div
              className="admin-visits-day"
              role="listitem"
              key={day.day}
              aria-label={`${day.day}: ${day.visits} visits`}
              title={`${day.day}: ${day.visits} visits`}
            >
              <span>{day.visits}</span>
              <div className="admin-visits-bar">
                <i style={{ height: `${(day.visits / max) * 100}%` }} />
              </div>
              <small>{day.day.slice(5)}</small>
            </div>
          ))}
        </div>
      )}
      <p className="admin-hint">
        Counts start when tracking is enabled. Repeat visits across different
        days are counted again. Shared networks count as one IP; this is not a
        count of individual people.
      </p>
    </section>
  );
}
