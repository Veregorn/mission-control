"use client";

import { useEffect, useState } from "react";
import { Goal, GoalTimeframe, GoalStatus } from "@/lib/types";

const TIMEFRAME_CONFIG: Record<GoalTimeframe, { label: string; color: string; desc: string }> = {
  short:  { label: "Corto plazo",  color: "text-amber-400 border-amber-800 bg-amber-900/20",  desc: "Semanas · 1-3 meses" },
  medium: { label: "Medio plazo",  color: "text-blue-400 border-blue-800 bg-blue-900/20",     desc: "3-12 meses" },
  long:   { label: "Largo plazo",  color: "text-purple-400 border-purple-800 bg-purple-900/20", desc: "1+ años" },
};

const STATUS_ICONS: Record<GoalStatus, string> = {
  active: "🎯",
  completed: "✅",
  paused: "⏸️",
};

export function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState<{
    title: string;
    timeframe: GoalTimeframe;
    description: string;
    projects: string;
  }>({ title: "", timeframe: "short", description: "", projects: "" });

  const refresh = async () => {
    const [goalsRes, projRes] = await Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setGoals(goalsRes.goals ?? []);
    setProjects((projRes.projects ?? []).map((p: { name: string }) => p.name));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    if (!newGoal.title.trim()) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newGoal.title,
        timeframe: newGoal.timeframe,
        description: newGoal.description,
        projects: newGoal.projects.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setNewGoal({ title: "", timeframe: "short", description: "", projects: "" });
    setShowForm(false);
    await refresh();
  };

  const handleStatus = async (id: string, status: GoalStatus) => {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    await refresh();
  };

  if (loading) return <p className="text-gray-500 text-sm">Cargando objetivos…</p>;

  const activeGoals = goals.filter((g) => g.status === "active");
  const otherGoals = goals.filter((g) => g.status !== "active");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🎯 Objetivos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Los objetivos sin proyectos son sueños — Tiago Forte
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1.5 transition-colors"
        >
          + Nuevo objetivo
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 space-y-3">
          <input
            type="text"
            placeholder="¿Cuál es tu objetivo? *"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 w-full"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            rows={2}
            className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 w-full resize-none"
          />
          <div className="flex gap-3">
            <select
              value={newGoal.timeframe}
              onChange={(e) => setNewGoal({ ...newGoal, timeframe: e.target.value as GoalTimeframe })}
              className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-2 border border-gray-700 flex-1"
            >
              <option value="short">🟡 Corto plazo (1-3 meses)</option>
              <option value="medium">🔵 Medio plazo (3-12 meses)</option>
              <option value="long">🟣 Largo plazo (1+ años)</option>
            </select>
          </div>
          <div>
            <input
              list="goal-projects-list"
              placeholder="Proyectos vinculados (separados por coma)"
              value={newGoal.projects}
              onChange={(e) => setNewGoal({ ...newGoal, projects: e.target.value })}
              className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 w-full"
            />
            <datalist id="goal-projects-list">
              {projects.map((p) => <option key={p} value={p} />)}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Un objetivo sin proyectos vinculados es solo un sueño.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm px-3 py-1 hover:text-gray-200">
              Cancelar
            </button>
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-4 py-1">
              Crear objetivo
            </button>
          </div>
        </div>
      )}

      {/* Goals by timeframe */}
      {activeGoals.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-sm">No tienes objetivos activos.</p>
          <p className="text-xs mt-1">Añade uno — recuerda vincularlo a un proyecto.</p>
        </div>
      )}

      {(["short", "medium", "long"] as GoalTimeframe[]).map((tf) => {
        const tfGoals = activeGoals.filter((g) => g.timeframe === tf);
        if (!tfGoals.length) return null;
        const cfg = TIMEFRAME_CONFIG[tf];
        return (
          <div key={tf} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`text-sm font-medium ${cfg.color.split(" ")[0]}`}>{cfg.label}</h3>
              <span className="text-xs text-gray-600">{cfg.desc}</span>
            </div>
            <div className="space-y-3">
              {tfGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  config={cfg}
                  onStatus={handleStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Completed/paused */}
      {otherGoals.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
            {otherGoals.length} objetivo(s) completado(s) o pausado(s)
          </summary>
          <div className="mt-3 space-y-2 opacity-60">
            {otherGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                config={TIMEFRAME_CONFIG[goal.timeframe]}
                onStatus={handleStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  config,
  onStatus,
  onDelete,
}: {
  goal: Goal;
  config: { label: string; color: string };
  onStatus: (id: string, s: GoalStatus) => void;
  onDelete: (id: string) => void;
}) {
  const hasProjects = goal.projects.length > 0;

  return (
    <div className={`border rounded-lg p-4 ${config.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{STATUS_ICONS[goal.status]}</span>
            <span className="text-sm font-medium text-gray-100">{goal.title}</span>
          </div>
          {goal.description && (
            <p className="text-xs text-gray-400 mt-1 ml-6">{goal.description}</p>
          )}
          <div className="mt-2 ml-6 flex flex-wrap gap-1">
            {hasProjects ? (
              goal.projects.map((p) => (
                <span key={p} className="text-xs bg-gray-800 text-gray-300 rounded px-2 py-0.5">
                  📁 {p}
                </span>
              ))
            ) : (
              <span className="text-xs text-amber-500">⚠️ Sin proyecto — vincula uno</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {goal.status === "active" && (
            <button
              onClick={() => onStatus(goal.id, "completed")}
              title="Marcar completado"
              className="text-xs text-green-400 hover:text-green-300 px-1.5 py-1"
            >✓</button>
          )}
          {goal.status === "active" && (
            <button
              onClick={() => onStatus(goal.id, "paused")}
              title="Pausar"
              className="text-xs text-gray-400 hover:text-gray-200 px-1.5 py-1"
            >⏸</button>
          )}
          {goal.status !== "active" && (
            <button
              onClick={() => onStatus(goal.id, "active")}
              title="Reactivar"
              className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-1"
            >↺</button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            title="Eliminar"
            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-1"
          >✕</button>
        </div>
      </div>
    </div>
  );
}
