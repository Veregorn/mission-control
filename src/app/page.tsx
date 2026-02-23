"use client";

import { useEffect, useState } from "react";
import { TaskBoard } from "@/components/TaskBoard";
import { MemoryLog } from "@/components/MemoryLog";
import { StatusBar } from "@/components/StatusBar";
import { Task } from "@/lib/types";

interface MemoryEntry {
  date: string;
  filename: string;
  excerpt: string;
  sizeBytes: number;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []));
  }, []);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => setMemories(data.memories || []));
  }, []);

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))];

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
            todoCount={todoCount}
            projectCount={projects.length}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TaskBoard />
        </div>
        <div>
          <MemoryLog memories={memories} />
        </div>
      </main>
    </div>
  );
}
