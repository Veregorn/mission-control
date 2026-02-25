"use client";

import { useCallback, useEffect, useState } from "react";

interface Cron {
  id: string;
  name: string;
  scheduleLabel: string;
  lastRunMs: number | null;
  nextRunMs: number | null;
  status: string;
}

function relativeTime(ms: number | null): string {
  if (ms == null) return "—";
  const diff = Date.now() - ms;
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let label: string;
  if (absDiff < 60000) label = "ahora";
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h`;
  else label = `${days}d`;

  return diff < 0 ? `en ${label}` : `hace ${label}`;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let color = "bg-gray-700 text-gray-400";
  let dot = "bg-gray-500";

  if (normalized === "ok" || normalized === "success") {
    color = "bg-green-900/50 text-green-400";
    dot = "bg-green-400";
  } else if (normalized === "error" || normalized === "failed") {
    color = "bg-red-900/50 text-red-400";
    dot = "bg-red-400";
  } else if (normalized === "pending" || normalized === "running") {
    color = "bg-blue-900/50 text-blue-400";
    dot = "bg-blue-400";
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

export function CronPanel() {
  const [crons, setCrons] = useState<Cron[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crons");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setCrons(data.crons ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">⏰ Cron Jobs</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "⟳ Cargando…" : "⟳ Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {crons.length === 0 && !loading && !error && (
        <p className="text-gray-600 text-sm">No se encontraron cron jobs.</p>
      )}

      <div className="space-y-2">
        {crons.map((cron) => (
          <div
            key={cron.id}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-200 truncate">{cron.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 font-mono">
                    {cron.scheduleLabel}
                  </span>
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                  <span>
                    <span className="text-gray-600">Último: </span>
                    {relativeTime(cron.lastRunMs)}
                  </span>
                  <span>
                    <span className="text-gray-600">Próximo: </span>
                    {relativeTime(cron.nextRunMs)}
                  </span>
                </div>
              </div>
              <StatusBadge status={cron.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
