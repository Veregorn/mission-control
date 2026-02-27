import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/config";
import { TaskStatus } from "@/lib/types";

const MC_TASKS_PATH = PATHS.taskInbox;

function statusToCheckbox(status: TaskStatus): string {
  if (status === "todo") return "[ ]";
  if (status === "in_progress") return "[/]";
  return "[x]";
}

function extractTitle(line: string): string {
  return line
    .replace(/^- \[[ /x]\]\s*/i, "")
    .replace(/%%.*?%%/g, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/#\w+[-\w]*/g, "")
    .trim();
}

function findLineIndex(lines: string[], id: string): number {
  try {
    const title = Buffer.from(id, "base64url").toString("utf-8");
    return lines.findIndex(
      (l) => /^- \[[ /x]\]/i.test(l) && extractTitle(l) === title
    );
  } catch {
    return lines.findIndex((l) => l.includes(`mc:id=${id}`));
  }
}

/** Try to find and update a task in the given file. Returns true if found & updated. */
function tryUpdateFile(filePath: string, id: string, status: TaskStatus): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const idx = findLineIndex(lines, id);
  if (idx === -1) return false;
  lines[idx] = lines[idx].replace(/^- \[[ /x]\]/i, `- ${statusToCheckbox(status)}`);
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return true;
}

/** Try to find and delete a task in the given file. Returns true if found & deleted. */
function tryDeleteFromFile(filePath: string, id: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const idx = findLineIndex(lines, id);
  if (idx === -1) return false;
  lines.splice(idx, 1);
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return true;
}

/** Returns all project file paths (active only). */
function allProjectFiles(): string[] {
  try {
    return fs
      .readdirSync(PATHS.obsidianProjects)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(PATHS.obsidianProjects, f));
  } catch {
    return [];
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status: TaskStatus };

    // 1. Try inbox first
    if (tryUpdateFile(MC_TASKS_PATH, id, status)) {
      return NextResponse.json({ ok: true, id, status, source: "inbox" });
    }

    // 2. Search all project files
    for (const filePath of allProjectFiles()) {
      if (tryUpdateFile(filePath, id, status)) {
        return NextResponse.json({ ok: true, id, status, source: path.basename(filePath) });
      }
    }

    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update task", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Only allow deleting from inbox (editable tasks)
    if (tryDeleteFromFile(MC_TASKS_PATH, id)) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Task not found or not editable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete task", detail: String(error) },
      { status: 500 }
    );
  }
}
