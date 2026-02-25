import fs from "fs";
import path from "path";
import { Task, TaskStatus, TaskPriority, TaskAssignee } from "./types";

export type { Task };

const EDITABLE_FILES = ["Task Inbox.md", "Mission Control Tasks.md"];

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
  const isEditable = EDITABLE_FILES.includes(path.basename(filepath));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let status: TaskStatus | null = null;

    if (/^- \[ \]/.test(line)) status = "todo";
    else if (/^- \[\/\]/.test(line)) status = "in_progress";
    else if (/^- \[x\]/i.test(line)) status = "done";

    if (status === null) continue;

    // Extract title (strip checkbox, tags, and any legacy comments)
    const rawTitle = line
      .replace(/^- \[[ /x]\]\s*/i, "")
      .replace(/%%.*?%%/g, "")
      .replace(/<!--.*?-->/g, "")
      .replace(/#\w+[-\w]*/g, "")
      .trim();

    if (!rawTitle) continue;

    // Parse priority/assignee from Obsidian tags
    const tagPriority = line.match(/#(high|medium|low)\b/)?.[1] as TaskPriority | undefined;
    const tagAssignee = line.match(/#(raul|serman)\b/)?.[1] as TaskAssignee | undefined;

    // ID derived from title — full base64url, no truncation (needed to decode back exactly)
    const id = Buffer.from(rawTitle).toString("base64url");
    const priority = (tagPriority ?? "medium") as TaskPriority;
    const assignee = (tagAssignee ?? "raul") as TaskAssignee;
    const project = projectName;

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
