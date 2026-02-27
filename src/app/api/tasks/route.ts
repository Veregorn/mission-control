import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/config";
import { parseTasksFromMarkdown } from "@/lib/parsers";
import { Task, TaskPriority, TaskAssignee } from "@/lib/types";

const MC_TASKS_PATH = PATHS.taskInbox;

/**
 * Resolves a project name to its Obsidian file path.
 * Returns null if no matching active project is found.
 */
function resolveProjectFile(projectName: string): string | null {
  if (!projectName?.trim()) return null;

  const normalized = projectName.trim().toLowerCase();

  try {
    const files = fs.readdirSync(PATHS.obsidianProjects).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(PATHS.obsidianProjects, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Active project filter — exclude completed/paused only
      if (content.includes("#completado") || content.includes("#pausado")) continue;

      const name = file.replace(".md", "").toLowerCase();
      if (name === normalized) return filePath;
    }
  } catch {
    // fall through → inbox
  }

  return null;
}

/**
 * Appends a task line to a project file.
 * Looks for a "## Tareas" section; creates one if absent.
 */
function appendTaskToProjectFile(filePath: string, line: string): number {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const TASK_SECTION = "## Tareas";

  const sectionIdx = lines.findIndex((l) => l.trim() === TASK_SECTION);

  let updated: string;

  if (sectionIdx !== -1) {
    // Insert right after the section header (skip blank lines)
    lines.splice(sectionIdx + 1, 0, line);
    updated = lines.join("\n");
  } else {
    // Append a new ## Tareas section at the end
    const tail = content.endsWith("\n") ? "" : "\n";
    updated = `${content}${tail}\n${TASK_SECTION}\n${line}\n`;
  }

  fs.writeFileSync(filePath, updated, "utf-8");

  // Return line number of the new task
  return updated.split("\n").findIndex((l) => l === line) + 1;
}

export async function GET() {
  const projectsDir = PATHS.obsidianProjects;
  const allTasks: Task[] = [];

  try {
    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"));

    // Always include Task Inbox
    if (fs.existsSync(PATHS.taskInbox)) {
      allTasks.push(...parseTasksFromMarkdown(PATHS.taskInbox, "Inbox"));
    }

    for (const file of files) {
      const filepath = path.join(projectsDir, file);
      const content = fs.readFileSync(filepath, "utf-8");
      if (content.includes("#completado") || content.includes("#pausado")) continue;

      const projectName = file.replace(".md", "");
      allTasks.push(...parseTasksFromMarkdown(filepath, projectName));
    }

    return NextResponse.json({ tasks: allTasks, count: allTasks.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read projects", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      title: string;
      priority: TaskPriority;
      assignee: TaskAssignee;
      project?: string;
    };

    const { title, priority, assignee, project } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const resolvedPriority = priority ?? "medium";
    const resolvedAssignee = assignee ?? "raul";
    const line = `- [ ] ${title.trim()} #${resolvedPriority} #${resolvedAssignee}`;
    const id = Buffer.from(title.trim()).toString("base64url");

    // Resolve project → file path (or fall back to inbox)
    const projectFilePath = project ? resolveProjectFile(project) : null;
    const targetPath = projectFilePath ?? MC_TASKS_PATH;
    const resolvedProject = project?.trim() || undefined;

    let lineNumber: number;

    if (projectFilePath) {
      // Write to project file under ## Tareas section
      lineNumber = appendTaskToProjectFile(projectFilePath, line);
    } else {
      // Write to Task Inbox under ## 📥 Sin clasificar
      const current = fs.readFileSync(MC_TASKS_PATH, "utf-8");
      const sectionMarker = "## 📥 Sin clasificar";
      let updated: string;

      if (current.includes(sectionMarker)) {
        updated = current
          .replace(/(## 📥 Sin clasificar\n+)\(vacío\)/, `$1${line}`)
          .replace(/(## 📥 Sin clasificar\n)(?!\()/, `$1${line}\n`);
        if (!updated.includes(line)) {
          updated = current.replace(/(## 📥 Sin clasificar\n)/, `$1${line}\n`);
        }
      } else {
        updated = current.endsWith("\n")
          ? current + line + "\n"
          : current + "\n" + line + "\n";
      }

      fs.writeFileSync(MC_TASKS_PATH, updated, "utf-8");
      const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      lineNumber =
        updated.split("\n").findIndex((l) =>
          new RegExp(`- \\[[ /x]\\]\\s+${escapedTitle}`).test(l)
        ) + 1;
    }

    const task: Task = {
      id,
      title: title.trim(),
      status: "todo",
      priority: resolvedPriority as TaskPriority,
      assignee: resolvedAssignee as TaskAssignee,
      project: resolvedProject,
      filePath: targetPath,
      lineNumber,
      editable: !projectFilePath, // only inbox tasks are editable via UI for now
    };

    return NextResponse.json(
      {
        task,
        destination: projectFilePath ? "project" : "inbox",
        projectResolved: !!projectFilePath,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create task", detail: String(error) },
      { status: 500 }
    );
  }
}
