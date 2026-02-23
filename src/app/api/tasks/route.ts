import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/config";
import { parseTasksFromMarkdown, Task } from "@/lib/parsers";

export async function GET() {
  const projectsDir = PATHS.obsidianProjects;
  const allTasks: Task[] = [];

  try {
    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filepath = path.join(projectsDir, file);
      const content = fs.readFileSync(filepath, "utf-8");

      // Only include #serman projects
      if (!content.includes("serman")) continue;
      // Skip completed/paused
      if (content.includes("#completado") || content.includes("#pausado"))
        continue;

      const projectName = file.replace(".md", "");
      const tasks = parseTasksFromMarkdown(filepath, projectName);
      allTasks.push(...tasks);
    }

    return NextResponse.json({ tasks: allTasks, count: allTasks.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read projects", detail: String(error) },
      { status: 500 }
    );
  }
}
