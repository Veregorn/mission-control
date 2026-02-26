import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

// Real shape of OpenClaw cron jobs.json entries
interface RawCronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr?: string;        // cron expression (e.g. "0 3 * * *")
    everyMs?: number;     // interval in ms
  };
  sessionTarget?: string;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;  // "ok" | "error" | "running" | ...
    consecutiveErrors?: number;
  };
}

function formatScheduleLabel(schedule: RawCronJob["schedule"]): string {
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

  if (schedule.kind === "cron" && schedule.expr) {
    const expr = schedule.expr;
    // Common cron expressions → human labels
    const cronMap: Record<string, string> = {
      "* * * * *": "cada minuto",
      "*/5 * * * *": "cada 5m",
      "*/10 * * * *": "cada 10m",
      "*/15 * * * *": "cada 15m",
      "*/30 * * * *": "cada 30m",
      "0 * * * *": "cada hora",
      "0 */2 * * *": "cada 2h",
      "0 */6 * * *": "cada 6h",
      "0 0 * * *": "00:00 diario",
      "0 1 * * *": "01:00 diario",
      "0 2 * * *": "02:00 diario",
      "0 3 * * *": "03:00 diario",
      "0 4 * * *": "04:00 diario",
      "0 5 * * *": "05:00 diario",
      "45 6 * * *": "06:45 diario",
      "0 8 * * *": "08:00 diario",
      "0 9 * * *": "09:00 diario",
      "0 10 * * 0": "dom 10:00",
      "0 17 * * 5": "vie 17:00",
      "0 19 * * *": "19:00 diario",
    };
    return cronMap[expr] ?? expr;
  }

  return schedule.kind ?? "—";
}

export async function GET() {
  try {
    // Read directly from OpenClaw cron store — avoids CLI parsing issues
    const cronPath = path.join(os.homedir(), ".openclaw", "cron", "jobs.json");
    const raw = fs.readFileSync(cronPath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: number; jobs?: RawCronJob[] };

    const jobs: RawCronJob[] = Array.isArray(parsed)
      ? (parsed as RawCronJob[])
      : (parsed.jobs ?? []);

    const crons = jobs
      .sort((a, b) => (a.state?.lastRunAtMs ?? 0) - (b.state?.lastRunAtMs ?? 0))
      .map((job) => ({
        id: job.id,
        name: job.name,
        enabled: job.enabled,
        scheduleLabel: formatScheduleLabel(job.schedule),
        lastRunMs: job.state?.lastRunAtMs ?? null,
        nextRunMs: job.state?.nextRunAtMs ?? null,
        // Use real field name: lastStatus, not lastRunStatus
        status: job.state?.lastStatus ?? (job.enabled ? "pending" : "disabled"),
        consecutiveErrors: job.state?.consecutiveErrors ?? 0,
      }));

    return NextResponse.json({ crons });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read crons", detail: String(error) },
      { status: 500 }
    );
  }
}
