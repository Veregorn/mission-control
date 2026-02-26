import { NextResponse } from "next/server";
import fs from "fs";
import { PATHS } from "@/lib/config";
import { Goal, GoalsFile } from "@/lib/types";
import { randomUUID } from "crypto";

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

export async function GET() {
  return NextResponse.json(readGoals());
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<Goal>;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const goal: Goal = {
    id: randomUUID(),
    title: body.title.trim(),
    timeframe: body.timeframe ?? "medium",
    description: body.description?.trim() ?? "",
    projects: body.projects ?? [],
    status: "active",
    createdAt: new Date().toISOString(),
  };

  const data = readGoals();
  data.goals.push(goal);
  writeGoals(data);

  return NextResponse.json({ goal }, { status: 201 });
}
