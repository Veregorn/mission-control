"use client";

import { useEffect, useState } from "react";

interface ProjectProgress {
  name: string;
  total: number;
  done: number;
  inProgress: number;
  pct: number;
}

export function ProjectsOverview() {
  const [projects, setProjects] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch("/api/tasks").then((r) => r.json()),
          fetch("/api/projects").then((r) => r.json()),
        ]);

        const tasks = tasksRes.tasks ?? [];
        const activeProjects: { name: string }[] = projectsRes.projects ?? [];

        const map = new Map<string, ProjectProgress>();

        // Init all active projects (even those with no tasks yet)
        for (const p of activeProjects) {
          map.set(p.name, { name: p.name, total: 0, done: 0, inProgress: 0, pct: 0 });
        }

        // Count tasks per project
        for (const t of tasks) {
          if (!t.project || t.project === "Inbox") continue;
          if (!map.has(t.project)) {
            map.set(t.project, { name: t.project, total: 0, done: 0, inProgress: 0, pct: 0 });
          }
          const p = map.get(t.project)!;
          p.total++;
          if (t.status === "done") p.done++;
          if (t.status === "in_progress") p.inProgress++;
        }

        const result = Array.from(map.values())
          .map((p) => ({ ...p, pct: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0 }))
          .sort((a, b) => b.pct - a.pct);

        setProjects(result);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-500 text-sm">Cargando proyectos…</p>;
  if (!projects.length) return <p className="text-gray-500 text-sm">No hay proyectos activos.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">🗂️ Proyectos activos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.name} project={p} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project: p }: { project: ProjectProgress }) {
  const color =
    p.pct >= 75 ? "bg-green-500" :
    p.pct >= 40 ? "bg-blue-500" :
    p.pct > 0   ? "bg-amber-500" :
                  "bg-gray-600";

  const badge =
    p.pct === 100 ? "✅ Completado" :
    p.pct >= 75   ? "🟢 Casi listo" :
    p.pct >= 40   ? "🔵 En curso" :
    p.total === 0 ? "⚪ Sin tareas" :
                    "🟡 Iniciado";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-100 leading-snug">{p.name}</h3>
        <span className="text-xs text-gray-400 whitespace-nowrap">{badge}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${p.pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{p.done}/{p.total} tareas</span>
        <span className="font-medium text-gray-300">{p.pct}%</span>
      </div>

      {p.inProgress > 0 && (
        <p className="text-xs text-blue-400 mt-1">{p.inProgress} en progreso</p>
      )}
    </div>
  );
}
