import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PATHS } from "@/lib/config";
import { parseTasksFromMarkdown } from "@/lib/parsers";
import { Task, TaskPriority, TaskAssignee } from "@/lib/types";

const MC_TASKS_PATH = PATHS.taskInbox;

export async function GET() {
  const projectsDir = PATHS.obsidianProjects;
  const allTasks: Task[] = [];

  try {
    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filepath = path.join(projectsDir, file);

      // Mission Control Tasks.md: always include
      if (file === "Mission Control Tasks.md") {
        allTasks.push(...parseTasksFromMarkdown(filepath, "Mission Control"));
        continue;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      if (!content.includes("serman")) continue;
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

    const id = crypto.randomUUID().slice(0, 8);
    const projectPart = project ? ` project=${project}` : "";
    const line = `- [ ] ${title} <!-- mc:id=${id} priority=${priority ?? "medium"} assignee=${assignee ?? "raul"}${projectPart} -->`;

    const current = fs.readFileSync(MC_TASKS_PATH, "utf-8");
    const updated = current.endsWith("\n")
      ? current + line + "\n"
      : current + "\n" + line + "\n";
    fs.writeFileSync(MC_TASKS_PATH, updated, "utf-8");

    const lineNumber = updated.split("\n").findIndex((l) => l.includes(`mc:id=${id}`)) + 1;

    const task: Task = {
      id,
      title: title.trim(),
      status: "todo",
      priority: priority ?? "medium",
      assignee: assignee ?? "raul",
      project,
      filePath: MC_TASKS_PATH,
      lineNumber,
      editable: true,
    };

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create task", detail: String(error) },
      { status: 500 }
    );
  }
}
