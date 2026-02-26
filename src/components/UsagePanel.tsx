"use client";

import { useEffect, useState } from "react";

interface UsageEntry {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

interface UsageSummary {
  today: UsageEntry;
  byModel: Record<string, UsageEntry>;
  lastUpdated: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function modelShortName(model: string) {
  if (model.includes("claude-sonnet")) return "Sonnet";
  if (model.includes("claude-opus")) return "Opus";
  if (model.includes("claude-haiku")) return "Haiku";
  if (model.includes("gemini")) return "Gemini";
  return model.split("/").pop() ?? model;
}

export function UsagePanel() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { setData(d); setError(null); })
      .catch(() => setError("No se pudo cargar el uso"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  if (loading) return <p className="text-gray-500 text-sm">Cargando uso…</p>;
  if (error || !data) return <p className="text-red-400 text-sm">{error ?? "Sin datos"}</p>;

  const { today, byModel } = data;
  const modelList = Object.values(byModel).sort((a, b) => b.cost - a.cost);

  // Context usage estimate: 200K window, assume current session uses today's tokens
  const totalTokensToday = today.input + today.output;
  const contextPct = Math.min(100, Math.round((totalTokensToday / 200_000) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">📊 Uso Anthropic — Hoy</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sesión principal · {new Date(data.lastUpdated).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button onClick={refresh} className="text-gray-400 hover:text-gray-200 text-sm">⟳</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Input" value={fmt(today.input)} sub="tokens" color="text-blue-400" />
        <StatCard label="Output" value={fmt(today.output)} sub="tokens" color="text-green-400" />
        <StatCard label="Cache hits" value={fmt(today.cacheRead)} sub="tokens" color="text-purple-400" />
        <StatCard label="Coste est." value={`$${today.cost.toFixed(3)}`} sub="USD hoy" color="text-amber-400" />
      </div>

      {/* Context usage bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Contexto consumido hoy</span>
          <span className="text-sm font-medium text-gray-200">{fmt(totalTokensToday)} / 200K tokens ({contextPct}%)</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              contextPct > 80 ? "bg-red-500" : contextPct > 50 ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ width: `${contextPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          El caching activo (~88% startup reduction) reduce el coste real de input/output.
        </p>
      </div>

      {/* Per-model breakdown */}
      {modelList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Por modelo</h3>
          <div className="space-y-3">
            {modelList.map((m) => (
              <div key={m.model} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-200 font-medium">{modelShortName(m.model)}</span>
                  <span className="text-gray-500 text-xs ml-2">{fmt(m.input + m.output)} tokens</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400">${m.cost.toFixed(3)}</span>
                  <span className="text-gray-600 text-xs ml-1">USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </div>
  );
}
