import { NextResponse } from "next/server";
import { execSync } from "child_process";

function formatScheduleLabel(schedule: {
  kind: string;
  everyMs?: number;
  expression?: string;
}): string {
  if (schedule.kind === "interval" && schedule.everyMs != null) {
    const ms = schedule.everyMs;
    const minutes = ms / 60000;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1 && days % 1 === 0) return `cada ${days}d`;
    if (hours >= 1 && hours % 1 === 0) return hours === 1 ? "cada hora" : `cada ${hours}h`;
    if (minutes >= 1 && minutes % 1 === 0) return `${minutes}m`;
    return `${ms}ms`;
  }

  if (schedule.kind === "cron" && schedule.expression) {
    const expr = schedule.expression;
    // Simple readable mappings for common cron expressions
    const cronMap: Record<string, string> = {
      "* * * * *": "cada minuto",
      "*/5 * * * *": "cada 5m",
      "*/10 * * * *": "cada 10m",
      "*/15 * * * *": "cada 15m",
      "*/30 * * * *": "cada 30m",
      "0 * * * *": "cada hora",
      "0 */2 * * *": "cada 2h",
      "0 */6 * * *": "cada 6h",
      "0 0 * * *": "diario 00:00",
      "0 9 * * *": "diario 09:00",
      "0 9 * * 1": "lunes 09:00",
    };
    return cronMap[expr] ?? expr;
  }

  return schedule.kind ?? "—";
}

export async function GET() {
  try {
    const output = execSync("npx openclaw cron list --json 2>/dev/null || echo '{\"jobs\":[]}'", {
      encoding: "utf-8",
      timeout: 10000,
    });

    let jobs: Array<{
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      schedule: { kind: string; everyMs?: number; expression?: string };
      sessionTarget?: string;
      state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastRunStatus?: string };
    }> = [];

    try {
      const parsed = JSON.parse(output);
      jobs = Array.isArray(parsed) ? parsed : (parsed.jobs ?? []);
    } catch {
      jobs = [];
    }

    const crons = jobs.map((job) => ({
      id: job.id,
      name: job.name,
      scheduleLabel: formatScheduleLabel(job.schedule),
      lastRunMs: job.state?.lastRunAtMs ?? null,
      nextRunMs: job.state?.nextRunAtMs ?? null,
      status: job.state?.lastRunStatus ?? (job.enabled ? "pending" : "disabled"),
    }));

    return NextResponse.json({ crons });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read crons", detail: String(error) },
      { status: 500 }
    );
  }
}
