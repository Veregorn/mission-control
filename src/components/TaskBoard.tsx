import { useState } from "react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "done";
  project: string;
}

interface TaskBoardProps {
  todoTasks: Task[];
  doneTasks: Task[];
  projects: string[];
}

export function TaskBoard({ todoTasks, doneTasks, projects }: TaskBoardProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = (tasks: Task[]) =>
    filter === "all" ? tasks : tasks.filter((t) => t.project === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📋 Task Board</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TODO Column */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Pending ({filtered(todoTasks).length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered(todoTasks).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {filtered(todoTasks).length === 0 && (
              <p className="text-gray-600 text-sm">No pending tasks</p>
            )}
          </div>
        </div>

        {/* DONE Column */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Done ({filtered(doneTasks).length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered(doneTasks).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {filtered(doneTasks).length === 0 && (
              <p className="text-gray-600 text-sm">No completed tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-gray-800/50 rounded px-3 py-2 text-sm">
      <div className="text-gray-200">{task.title}</div>
      <div className="text-xs text-gray-500 mt-1">{task.project}</div>
    </div>
  );
}
