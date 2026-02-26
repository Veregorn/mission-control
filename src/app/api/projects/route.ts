import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/config";

export interface ObsidianProject {
  name: string;
  filename: string;
  filePath: string;
}

/** Returns active Obsidian projects (same filter as GET /api/tasks) */
export async function GET() {
  try {
    const files = fs
      .readdirSync(PATHS.obsidianProjects)
      .filter((f) => f.endsWith(".md"));

    const projects: ObsidianProject[] = [];

    for (const file of files) {
      const filePath = path.join(PATHS.obsidianProjects, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Same filters as task GET: must have serman, not completado/pausado
      if (!content.includes("serman")) continue;
      if (content.includes("#completado") || content.includes("#pausado")) continue;

      projects.push({
        name: file.replace(".md", ""),
        filename: file,
        filePath,
      });
    }

    projects.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ projects, count: projects.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read projects", detail: String(error) },
      { status: 500 }
    );
  }
}
