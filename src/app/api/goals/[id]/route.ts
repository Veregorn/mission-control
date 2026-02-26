import { NextResponse } from "next/server";
import fs from "fs";
import { PATHS } from "@/lib/config";
import { Goal, GoalsFile } from "@/lib/types";

function readGoals(): GoalsFile {
  try {
    return JSON.parse(fs.readFileSync(PATHS.goals, "utf-8"));
  } catch {
    return { goals: [] };
  }
}

function writeGoals(data: GoalsFile) {
  fs.writeFileSync(PATHS.goals, JSON.stringify(data, null, 2), "utf-8");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as Partial<Goal>;
  const data = readGoals();
  const idx = data.goals.findIndex((g) => g.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  data.goals[idx] = { ...data.goals[idx], ...body, id };
  writeGoals(data);
  return NextResponse.json({ goal: data.goals[idx] });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readGoals();
  const idx = data.goals.findIndex((g) => g.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  data.goals.splice(idx, 1);
  writeGoals(data);
  return NextResponse.json({ ok: true });
}
