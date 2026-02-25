"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Task, TaskPriority, TaskAssignee, TaskStatus } from "@/lib/types";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-gray-400",
};

const PRIORITY_ICONS: Record<TaskPriority, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

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

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  return { tasks, setTasks, loading, refreshTasks };
}

const columns: { status: TaskStatus; label: string; color: string; dot: string }[] = [
  { status: "todo", label: "Pendiente", color: "text-amber-400", dot: "bg-amber-400" },
  { status: "in_progress", label: "En progreso", color: "text-blue-400", dot: "bg-blue-400" },
  { status: "done", label: "Completado", color: "text-green-400", dot: "bg-green-400" },
];

export function TaskBoard() {
  const { tasks, setTasks, loading, refreshTasks } = useTasks();

  const [filter, setFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    project: "",
    assignee: "raul" as TaskAssignee,
    priority: "medium" as TaskPriority,
  });

  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))];

  const filtered = (status: TaskStatus) =>
    tasks.filter((t) => {
      if (t.status !== status) return false;
      if (filter !== "all" && t.project !== filter) return false;
      if (assigneeFilter !== "all" && t.assignee !== assigneeFilter) return false;
      return true;
    });

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTask.title,
        priority: newTask.priority,
        assignee: newTask.assignee,
        project: newTask.project || undefined,
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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    await fetch(`/api/tasks/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">📋 Task Board</h2>
          <button
            onClick={refreshTasks}
            title="Refresh"
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            {loading ? "⟳" : "⟳"}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 border border-gray-700"
          >
            <option value="all">Todos</option>
            <option value="raul">Raúl</option>
            <option value="serman">Serman</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 border border-gray-700"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1 transition-colors"
          >
            + Nueva tarea
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Título de la tarea *"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700 col-span-full"
          />
          <input
            type="text"
            placeholder="Proyecto (opcional)"
            value={newTask.project}
            onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
            className="bg-gray-800 text-sm text-gray-200 rounded px-3 py-2 border border-gray-700"
          />
          <div className="flex gap-2">
            <select
              value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value as TaskAssignee })}
              className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-2 border border-gray-700 flex-1"
            >
              <option value="raul">Raúl</option>
              <option value="serman">Serman</option>
            </select>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
              className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-2 border border-gray-700 flex-1"
            >
              <option value="high">🔴 Alta</option>
              <option value="medium">🟡 Media</option>
              <option value="low">🟢 Baja</option>
            </select>
          </div>
          <div className="col-span-full flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm px-3 py-1 hover:text-gray-200">
              Cancelar
            </button>
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-4 py-1">
              Crear
            </button>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(({ status, label, color, dot }) => {
            const colTasks = filtered(status);
            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-gray-900 rounded-lg p-4 border transition-colors ${
                      snapshot.isDraggingOver ? "border-gray-600 bg-gray-800/50" : "border-gray-800"
                    }`}
                  >
                    <h3 className={`text-sm font-medium ${color} mb-3 flex items-center gap-2`}>
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label} ({colTasks.length})
                    </h3>
                    <div className="space-y-2 min-h-[2rem]">
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-80 rotate-1" : ""}
                            >
                              <TaskCard
                                task={task}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && (
                        <p className="text-gray-600 text-sm">Sin tareas</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    todo: "in_progress",
    in_progress: "done",
    done: "todo",
  };

  return (
    <div className="bg-gray-800/50 rounded px-3 py-2 text-sm group relative cursor-grab active:cursor-grabbing">
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1">
          <div className="text-gray-200">{task.title}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            {task.project && <span>{task.project}</span>}
            <span className={PRIORITY_COLORS[task.priority]}>
              {PRIORITY_ICONS[task.priority]}
            </span>
            <span className="text-gray-600">{task.assignee === "raul" ? "👤" : "🛠️"}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="text-xs text-blue-400 hover:text-blue-300 px-1"
            title="Avanzar estado"
          >→</button>
          {task.editable && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-xs text-red-400 hover:text-red-300 px-1"
              title="Eliminar"
            >✕</button>
          )}
        </div>
      </div>
    </div>
  );
}
