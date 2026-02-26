"use client";

import { useEffect, useState } from "react";
import { TaskBoard } from "@/components/TaskBoard";
import { CronPanel } from "@/components/CronPanel";
import { MemoryLog } from "@/components/MemoryLog";
import { StatusBar } from "@/components/StatusBar";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { GoalsPanel } from "@/components/GoalsPanel";
import { UsagePanel } from "@/components/UsagePanel";
import { Task } from "@/lib/types";

interface MemoryEntry {
  date: string;
  filename: string;
  excerpt: string;
  sizeBytes: number;
}

type Tab = "projects" | "tasks" | "goals" | "usage" | "crons" | "memory";

const TABS: { id: Tab; label: string }[] = [
  { id: "projects", label: "🗂️ Proyectos" },
  { id: "tasks",    label: "📋 Tasks" },
  { id: "goals",    label: "🎯 Objetivos" },
  { id: "usage",    label: "📊 Uso" },
  { id: "crons",    label: "⏰ Crons" },
  { id: "memory",   label: "📚 Memory" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("projects");

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

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 border-b border-gray-800 mt-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "projects" && <ProjectsOverview />}
        {activeTab === "tasks"    && <TaskBoard />}
        {activeTab === "goals"    && <GoalsPanel />}
        {activeTab === "usage"    && <UsagePanel />}
        {activeTab === "crons"    && <CronPanel />}
        {activeTab === "memory"   && <MemoryLog memories={memories} />}
      </main>
    </div>
  );
}
