"use client";

import { useEffect, useState } from "react";
import { TaskBoard } from "@/components/TaskBoard";
import { MemoryLog } from "@/components/MemoryLog";
import { StatusBar } from "@/components/StatusBar";

interface Task {
  id: string;
  title: string;
  status: "todo" | "done";
  project: string;
}

interface MemoryEntry {
  date: string;
  filename: string;
  excerpt: string;
  sizeBytes: number;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/memory").then((r) => r.json()),
    ])
      .then(([taskData, memData]) => {
        setTasks(taskData.tasks || []);
        setMemories(memData.memories || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const projects = [...new Set(tasks.map((t) => t.project))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-400">
          Loading Mission Control...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛰️</span>
            <h1 className="text-xl font-semibold">Mission Control</h1>
            <span className="text-sm text-gray-500">OpenClaw Dashboard</span>
          </div>
          <StatusBar
            taskCount={tasks.length}
            todoCount={todoTasks.length}
            projectCount={projects.length}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TaskBoard
            todoTasks={todoTasks}
            doneTasks={doneTasks}
            projects={projects}
          />
        </div>
        <div>
          <MemoryLog memories={memories} />
        </div>
      </main>
    </div>
  );
}
