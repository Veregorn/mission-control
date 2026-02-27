"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Task, TaskPriority, TaskAssignee, TaskStatus } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high:   "text-red-400",
  medium: "text-amber-400",
  low:    "text-gray-400",
};
const PRIORITY_ICONS: Record<TaskPriority, string> = {
  high: "🔴", medium: "🟡", low: "🟢",
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "Alta", medium: "Media", low: "Baja",
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "⏳ Pendiente", in_progress: "🔵 En progreso", done: "✅ Hecho",
};

type ViewMode = "kanban" | "by-project" | "by-priority";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "kanban",      label: "🗃️ Kanban" },
  { id: "by-project",  label: "📁 Por proyecto" },
  { id: "by-priority", label: "🎯 Por prioridad" },
];

const columns: { status: TaskStatus; label: string; color: string; dot: string }[] = [
  { status: "todo",        label: "Pendiente",   color: "text-amber-400", dot: "bg-amber-400" },
  { status: "in_progress", label: "En progreso", color: "text-blue-400",  dot: "bg-blue-400"  },
  { status: "done",        label: "Completado",  color: "text-green-400", dot: "bg-green-400" },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  return { tasks, setTasks, loading, refreshTasks };
}

// ─── TaskBoard ────────────────────────────────────────────────────────────────

export function TaskBoard() {
  const { tasks, setTasks, loading, refreshTasks } = useTasks();

  const [viewMode, setViewMode]           = useState<ViewMode>("kanban");
  const [filter, setFilter]               = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showForm, setShowForm]           = useState(false);
  const [newTask, setNewTask]             = useState({
    title: "", project: "",
    assignee: "raul" as TaskAssignee,
    priority: "medium" as TaskPriority,
  });
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setAvailableProjects((d.projects ?? []).map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, []);

  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))];

  const applyFilters = (list: Task[]) =>
    list.filter((t) => {
      if (filter !== "all" && t.project !== filter) return false;
      if (assigneeFilter !== "all" && t.assignee !== assigneeFilter) return false;
      return true;
    });

  const filteredByStatus = (status: TaskStatus) =>
    applyFilters(tasks.filter((t) => t.status === status));

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTask.title, priority: newTask.priority,
        assignee: newTask.assignee, project: newTask.project || undefined,
      }),
    });
    setNewTask({ title: "", project: "", assignee: "raul", priority: "medium" });
    setShowForm(false);
    await refreshTasks();
  };

  const handleStatusChange = async (id: string, nextStatus: TaskStatus) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await refreshTasks();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await refreshTasks();
  };

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || task.status === newStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)));
    await fetch(`/api/tasks/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">📋 Task Board</h2>
          <button onClick={refreshTasks} title="Refresh"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors">
            {loading ? "⟳" : "⟳"}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* View switcher */}
          <div className="flex rounded overflow-hidden border border-gray-700">
            {VIEW_OPTIONS.map((v) => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === v.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Filters */}
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 border border-gray-700">
            <option value="all">Todos</option>
            <option value="raul">Raúl</option>
            <option value="serman">Serman</option>
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 border border-gray-700">
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1 transition-colors">
            + Nueva tarea
          </button>
        </div>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Título de la tarea *" value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 col-span-full" />
          <div className="relative">
            <input list="projects-list" placeholder="Proyecto (opcional)" value={newTask.project}
              onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
              className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 w-full" />
            <datalist id="projects-list">
              {availableProjects.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="flex gap-2">
            <select value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value as TaskAssignee })}
              className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-2 border border-gray-700 flex-1">
              <option value="raul">Raúl</option>
              <option value="serman">Serman</option>
            </select>
            <select value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
              className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-2 border border-gray-700 flex-1">
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Media</option>
              <option value="low">🟢 Baja</option>
            </select>
          </div>
          <div className="col-span-full flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm px-3 py-1 hover:text-gray-200">
              Cancelar
            </button>
            <button onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-4 py-1">
              Crear
            </button>
          </div>
        </div>
      )}

      {/* ── Views ── */}
      {viewMode === "kanban" && (
        <KanbanView
          filteredByStatus={filteredByStatus}
          tasks={tasks}
          setTasks={setTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onDragEnd={handleDragEnd}
        />
      )}
      {viewMode === "by-project" && (
        <GroupedView
          tasks={applyFilters(tasks)}
          groupBy="project"
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
      {viewMode === "by-priority" && (
        <GroupedView
          tasks={applyFilters(tasks)}
          groupBy="priority"
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  filteredByStatus, tasks, setTasks, onStatusChange, onDelete, onDragEnd,
}: {
  filteredByStatus: (s: TaskStatus) => Task[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onDragEnd: (r: DropResult) => void;
}) {
  void tasks; void setTasks; // used by parent drag handler
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(({ status, label, color, dot }) => {
          const colTasks = filteredByStatus(status);
          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`bg-gray-900 rounded-lg p-4 border transition-colors ${
                    snapshot.isDraggingOver ? "border-gray-600 bg-gray-800/50" : "border-gray-800"
                  }`}>
                  <h3 className={`text-sm font-medium ${color} mb-3 flex items-center gap-2`}>
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    {label} ({colTasks.length})
                  </h3>
                  <div className="space-y-2 min-h-[2rem]">
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "opacity-80 rotate-1" : ""}>
                            <TaskCard task={task} onStatusChange={onStatusChange} onDelete={onDelete} showProject />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && <p className="text-gray-600 text-sm">Sin tareas</p>}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ─── Grouped View ─────────────────────────────────────────────────────────────

function GroupedView({
  tasks, groupBy, onStatusChange, onDelete,
}: {
  tasks: Task[];
  groupBy: "project" | "priority";
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  // Only show active tasks (todo + in_progress); done tasks collapsed by default
  const activeTasks  = tasks.filter((t) => t.status !== "done");
  const doneTasks    = tasks.filter((t) => t.status === "done");
  const [showDone, setShowDone] = useState(false);

  const sortByPriority = (list: Task[]) =>
    [...list].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  if (groupBy === "by-project" as string || groupBy === "project") {
    // Group by project, sort tasks within each group by priority
    const groups: Record<string, Task[]> = {};
    for (const task of activeTasks) {
      const key = task.project ?? "📥 Inbox";
      groups[key] = groups[key] ?? [];
      groups[key].push(task);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "📥 Inbox") return 1;
      if (b === "📥 Inbox") return -1;
      return a.localeCompare(b);
    });

    return (
      <div className="space-y-6">
        {sortedKeys.map((project) => (
          <div key={project}>
            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-800">
              <span className="text-sm font-medium text-blue-300">📁 {project}</span>
              <span className="text-xs text-gray-600">{groups[project].length} tarea{groups[project].length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {sortByPriority(groups[project]).map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={onStatusChange}
                  onDelete={onDelete} showProject={false} showStatus />
              ))}
            </div>
          </div>
        ))}
        <DoneCollapsible tasks={doneTasks} show={showDone} onToggle={() => setShowDone(!showDone)}
          onStatusChange={onStatusChange} onDelete={onDelete} showProject />
      </div>
    );
  }

  // Group by priority, sort tasks within each group by status
  const STATUS_ORDER: Record<TaskStatus, number> = { in_progress: 0, todo: 1, done: 2 };
  const priorityGroups: Record<TaskPriority, Task[]> = { high: [], medium: [], low: [] };
  for (const task of activeTasks) {
    priorityGroups[task.priority].push(task);
  }

  const priorityConfig: { key: TaskPriority; color: string; bg: string }[] = [
    { key: "high",   color: "text-red-400",   bg: "border-red-900/40" },
    { key: "medium", color: "text-amber-400", bg: "border-amber-900/40" },
    { key: "low",    color: "text-gray-400",  bg: "border-gray-800" },
  ];

  return (
    <div className="space-y-6">
      {priorityConfig.map(({ key, color, bg }) => {
        const group = priorityGroups[key];
        if (!group.length) return null;
        const sorted = [...group].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        return (
          <div key={key}>
            <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${bg}`}>
              <span className={`text-sm font-medium ${color}`}>
                {PRIORITY_ICONS[key]} Prioridad {PRIORITY_LABELS[key]}
              </span>
              <span className="text-xs text-gray-600">{group.length} tarea{group.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {sorted.map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={onStatusChange}
                  onDelete={onDelete} showProject showStatus hidePriority />
              ))}
            </div>
          </div>
        );
      })}
      <DoneCollapsible tasks={doneTasks} show={showDone} onToggle={() => setShowDone(!showDone)}
        onStatusChange={onStatusChange} onDelete={onDelete} showProject />
    </div>
  );
}

function DoneCollapsible({
  tasks, show, onToggle, onStatusChange, onDelete, showProject,
}: {
  tasks: Task[]; show: boolean; onToggle: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  showProject: boolean;
}) {
  if (!tasks.length) return null;
  return (
    <div>
      <button onClick={onToggle} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
        {show ? "▾" : "▸"} {tasks.length} tarea{tasks.length !== 1 ? "s" : ""} completada{tasks.length !== 1 ? "s" : ""}
      </button>
      {show && (
        <div className="mt-2 space-y-2 opacity-50">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange}
              onDelete={onDelete} showProject={showProject} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress", in_progress: "done", done: "todo",
};

function TaskCard({
  task, onStatusChange, onDelete, showProject = true, showStatus = false, hidePriority = false,
}: {
  task: Task;
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  showProject?: boolean;
  showStatus?: boolean;
  hidePriority?: boolean;
}) {
  return (
    <div className="bg-gray-800/50 rounded px-3 py-2 text-sm group relative cursor-default">
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1">
          <div className="text-gray-200">{task.title}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
            {showProject && task.project && (
              <span className="text-blue-400/70">📁 {task.project}</span>
            )}
            {!hidePriority && (
              <span className={PRIORITY_COLORS[task.priority]}>
                {PRIORITY_ICONS[task.priority]} {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {showStatus && (
              <span className="text-gray-500">{STATUS_LABELS[task.status]}</span>
            )}
            <span className="text-gray-600">{task.assignee === "raul" ? "👤 Raúl" : "🛠️ Serman"}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="text-xs text-blue-400 hover:text-blue-300 px-1" title="Avanzar estado">→</button>
          {task.editable && (
            <button onClick={() => onDelete(task.id)}
              className="text-xs text-red-400 hover:text-red-300 px-1" title="Eliminar">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}
