"use client";

import { useEffect, useState } from "react";
import type { AgentInfo } from "@/app/api/agents/route";

function timeAgo(ts: number): string {
  if (!ts) return "nunca";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora mismo";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

const STATUS_COLORS = {
  active: { dot: "bg-green-400", ring: "ring-green-500/40", glow: "shadow-green-500/20" },
  idle:   { dot: "bg-amber-400", ring: "ring-amber-500/30", glow: "shadow-amber-500/10" },
  offline:{ dot: "bg-gray-600",  ring: "ring-gray-700/20",  glow: "" },
};

const STATUS_LABELS = {
  active:  "🟢 Activo",
  idle:    "🟡 Reciente",
  offline: "⚫ Inactivo",
};

const ROLE_LABELS = {
  main:     "Agente principal",
  cron:     "Bot programado",
  subagent: "Subagente",
  voice:    "Agente de voz",
};

function AgentDesk({ agent }: { agent: AgentInfo }) {
  const colors = STATUS_COLORS[agent.status];
  const isMain = agent.role === "main";

  return (
    <div
      className={`
        relative bg-gray-900 border border-gray-700 rounded-xl p-4
        ring-2 ${colors.ring}
        ${agent.status === "active" ? `shadow-lg ${colors.glow}` : ""}
        transition-all duration-300
        ${isMain ? "col-span-1 md:col-span-1 border-blue-800 ring-blue-500/30" : ""}
      `}
    >
      {/* Status dot */}
      <span
        className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${colors.dot} ${
          agent.status === "active" ? "animate-pulse" : ""
        }`}
      />

      {/* Avatar */}
      <div
        className={`
          text-4xl mb-3 text-center select-none
          ${agent.status === "active" && isMain ? "animate-[float_3s_ease-in-out_infinite]" : ""}
        `}
        style={
          agent.status === "active" && isMain
            ? { animation: "float 3s ease-in-out infinite" }
            : {}
        }
      >
        {agent.emoji}
      </div>

      {/* Name */}
      <p className={`text-sm font-semibold text-center truncate ${isMain ? "text-blue-300" : "text-gray-200"}`}>
        {isMain ? agent.name : agent.name.charAt(0).toUpperCase() + agent.name.slice(1)}
      </p>

      {/* Role */}
      <p className="text-xs text-gray-500 text-center mt-0.5">{ROLE_LABELS[agent.role]}</p>

      {/* Status */}
      <p className="text-xs text-center mt-2">{STATUS_LABELS[agent.status]}</p>

      {/* Last seen */}
      <p className="text-xs text-gray-600 text-center mt-1">{timeAgo(agent.lastSeen)}</p>

      {/* Description */}
      {agent.description && (
        <p className="text-xs text-gray-600 text-center mt-2 truncate" title={agent.description}>
          {agent.description}
        </p>
      )}
    </div>
  );
}

export function OfficePanel() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<number>(0);

  const refresh = async () => {
    setLoading(true);
    const data = await fetch("/api/agents").then((r) => r.json());
    setAgents(data.agents ?? []);
    setGeneratedAt(data.generatedAt ?? Date.now());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60_000); // auto-refresh cada minuto
    return () => clearInterval(iv);
  }, []);

  const main   = agents.filter((a) => a.role === "main");
  const crons  = agents.filter((a) => a.role === "cron");
  const subs   = agents.filter((a) => a.role === "subagent");

  const active = agents.filter((a) => a.status === "active").length;
  const idle   = agents.filter((a) => a.status === "idle").length;

  if (loading) return <p className="text-gray-500 text-sm">Conectando con la oficina…</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">🏢 Oficina Digital</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {active} activo{active !== 1 ? "s" : ""} · {idle} reciente{idle !== 1 ? "s" : ""} ·{" "}
            {agents.length - active - idle} inactivo{agents.length - active - idle !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {generatedAt ? new Date(generatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
          <button onClick={refresh} className="text-gray-400 hover:text-gray-200 text-sm" title="Refrescar">
            ⟳
          </button>
        </div>
      </div>

      {/* Serman's Corner */}
      <div className="mb-8">
        <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-3">
          🛰️ Control Central
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {main.map((a) => <AgentDesk key={a.id} agent={a} />)}
        </div>
      </div>

      {/* Active subagents */}
      {subs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-3">
            🧩 Subagentes en vuelo
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {subs.map((a) => <AgentDesk key={a.id} agent={a} />)}
          </div>
        </div>
      )}

      {/* Cron bots floor */}
      {crons.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            🤖 Sala de Bots
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {crons.map((a) => <AgentDesk key={a.id} agent={a} />)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Activo (&lt;30 min)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Reciente (&lt;6h)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" /> Inactivo</span>
      </div>
    </div>
  );
}
