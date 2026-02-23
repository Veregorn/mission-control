import fs from "fs";
import path from "path";
import { Task, TaskStatus, TaskPriority, TaskAssignee } from "./types";

export type { Task };

const MC_TASKS_FILE = "Mission Control Tasks.md";

function stableId(filePath: string, lineNumber: number): string {
  return Buffer.from(`${filePath}:${lineNumber}`).toString("base64url").slice(0, 12);
}

/**
 * Parse checkboxes from an Obsidian markdown file
 */
export function parseTasksFromMarkdown(filepath: string, projectName: string): Task[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const tasks: Task[] = [];
  const lines = content.split("\n");
  const isEditable = path.basename(filepath) === MC_TASKS_FILE;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let status: TaskStatus | null = null;

    if (/^- \[ \]/.test(line)) status = "todo";
    else if (/^- \[\/\]/.test(line)) status = "in_progress";
    else if (/^- \[x\]/i.test(line)) status = "done";

    if (status === null) continue;

    // Extract title (text after checkbox marker, strip mc comment)
    const rawTitle = line
      .replace(/^- \[[ /x]\]\s*/i, "")
      .replace(/<!--.*?-->/g, "")
      .replace(/#\w+/g, "")
      .trim();

    if (!rawTitle) continue;

    // Parse mc metadata comment
    const mcMatch = line.match(/<!--\s*mc:id=(\S+)\s+priority=(\S+)\s+assignee=(\S+)(?:\s+project=(\S+))?\s*-->/);

    const id = mcMatch ? mcMatch[1] : stableId(filepath, i + 1);
    const priority = (mcMatch ? mcMatch[2] : "medium") as TaskPriority;
    const assignee = (mcMatch ? mcMatch[3] : "raul") as TaskAssignee;
    const project = mcMatch ? mcMatch[4] : projectName;

    tasks.push({
      id,
      title: rawTitle,
      status,
      priority,
      assignee,
      project,
      filePath: filepath,
      lineNumber: i + 1,
      editable: isEditable,
    });
  }

  return tasks;
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
