import fs from "fs";
import path from "path";

export interface Task {
  id: string;
  title: string;
  status: "todo" | "done";
  project: string;
  priority?: string;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
}

export interface MemoryEntry {
  date: string;
  filename: string;
  excerpt: string;
  sizeBytes: number;
}

/**
 * Parse checkboxes from an Obsidian markdown file
 */
export function parseTasksFromMarkdown(
  filepath: string,
  projectName: string
): Task[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const tasks: Task[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const todoMatch = line.match(/^- \[ \] (.+)/);
    const doneMatch = line.match(/^- \[x\] (.+)/i);

    if (todoMatch) {
      tasks.push({
        id: `${projectName}-${tasks.length}`,
        title: todoMatch[1].replace(/#\w+/g, "").trim(),
        status: "todo",
        project: projectName,
      });
    } else if (doneMatch) {
      tasks.push({
        id: `${projectName}-${tasks.length}`,
        title: doneMatch[1].replace(/#\w+/g, "").trim(),
        status: "done",
        project: projectName,
      });
    }
  }

  return tasks;
}

/**
 * Parse cron jobs from OpenClaw config
 */
export function parseCronJobs(clawdDir: string): CronJob[] {
  const cronPath = path.join(clawdDir, ".clawdbot", "crons.json");
  // Also try the gateway config
  const configPath = path.join(clawdDir, "crons.json");

  for (const p of [cronPath, configPath]) {
    try {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (Array.isArray(data)) {
        return data.map((c: Record<string, string>, i: number) => ({
          id: c.id || `cron-${i}`,
          name: c.name || c.label || "unnamed",
          schedule: c.schedule || c.cron || "",
          description: c.prompt || c.description || "",
        }));
      }
    } catch {
      // try next
    }
  }

  return [];
}

/**
 * List memory files sorted by date (newest first)
 */
export function listMemoryFiles(memoryDir: string): MemoryEntry[] {
  try {
    const files = fs
      .readdirSync(memoryDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();

    return files.map((f) => {
      const filepath = path.join(memoryDir, f);
      const stats = fs.statSync(filepath);
      const content = fs.readFileSync(filepath, "utf-8");
      const firstLines = content.split("\n").slice(0, 5).join("\n");

      return {
        date: f.replace(".md", ""),
        filename: f,
        excerpt: firstLines,
        sizeBytes: stats.size,
      };
    });
  } catch {
    return [];
  }
}
