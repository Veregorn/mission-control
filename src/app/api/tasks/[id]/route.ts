import { NextResponse } from "next/server";
import fs from "fs";
import { PATHS } from "@/lib/config";
import { TaskStatus } from "@/lib/types";

const MC_TASKS_PATH = PATHS.taskInbox;

function statusToCheckbox(status: TaskStatus): string {
  if (status === "todo") return "[ ]";
  if (status === "in_progress") return "[/]";
  return "[x]";
}

function findLineIndex(lines: string[], id: string): number {
  // Support both Obsidian comments (%% ... %%) and legacy HTML comments
  return lines.findIndex(
    (l) => l.includes(`%% mc:id=${id}`) || l.includes(`<!-- mc:id=${id}`)
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status: TaskStatus };

    const content = fs.readFileSync(MC_TASKS_PATH, "utf-8");
    const lines = content.split("\n");
    const idx = findLineIndex(lines, id);

    if (idx === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    lines[idx] = lines[idx].replace(/^- \[[ /x]\]/i, `- ${statusToCheckbox(status)}`);
    fs.writeFileSync(MC_TASKS_PATH, lines.join("\n"), "utf-8");

    return NextResponse.json({ ok: true, id, status });
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

    const content = fs.readFileSync(MC_TASKS_PATH, "utf-8");
    const lines = content.split("\n");
    const idx = findLineIndex(lines, id);

    if (idx === -1) {
      return NextResponse.json({ error: "Task not found or not editable" }, { status: 404 });
    }

    lines.splice(idx, 1);
    fs.writeFileSync(MC_TASKS_PATH, lines.join("\n"), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete task", detail: String(error) },
      { status: 500 }
    );
  }
}
