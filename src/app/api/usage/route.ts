import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import readline from "readline";
import { PATHS } from "@/lib/config";

interface UsageEntry {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

interface UsageSummary {
  today: UsageEntry;
  byModel: Record<string, UsageEntry>;
  lastUpdated: string;
}

async function parseSessionUsage(filePath: string, sinceMs: number): Promise<UsageSummary> {
  const byModel: Record<string, UsageEntry> = {};
  const today: UsageEntry = { model: "total", input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };

  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const tsRaw = entry.timestamp ?? entry._meta?.date;
      const ts: number = typeof tsRaw === "number" ? tsRaw : tsRaw ? new Date(tsRaw).getTime() : 0;
      if (ts < sinceMs) continue;

      // OpenClaw JSONL format: usage lives at entry.message.usage (camelCase)
      // Only process message-type entries with usage data
      if (entry.type !== "message") continue;
      const usage = entry.message?.usage;
      const model: string = entry.message?.model ?? entry.message?.api?.split("/").pop() ?? "unknown";
      if (!usage) continue;

      const input = usage.input ?? usage.input_tokens ?? 0;
      const output = usage.output ?? usage.output_tokens ?? 0;
      const cacheRead = usage.cacheRead ?? usage.cache_read_input_tokens ?? 0;
      const cacheWrite = usage.cacheWrite ?? usage.cache_creation_input_tokens ?? 0;
      // Use pre-computed cost if available, otherwise estimate
      const cost = usage.cost?.total ??
        ((input / 1e6) * 3 + (output / 1e6) * 15 + (cacheRead / 1e6) * 0.3 + (cacheWrite / 1e6) * 3.75);

      today.input += input;
      today.output += output;
      today.cacheRead += cacheRead;
      today.cacheWrite += cacheWrite;
      today.cost += cost;

      if (!byModel[model]) {
        byModel[model] = { model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
      }
      byModel[model].input += input;
      byModel[model].output += output;
      byModel[model].cacheRead += cacheRead;
      byModel[model].cacheWrite += cacheWrite;
      byModel[model].cost += cost;
    } catch {
      // skip malformed lines
    }
  }

  return { today, byModel, lastUpdated: new Date().toISOString() };
}

export async function GET() {
  try {
    const sessionsDir = PATHS.openclawSessions;
    const files = fs
      .readdirSync(sessionsDir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({ f, mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) {
      return NextResponse.json({ error: "No sessions found" }, { status: 404 });
    }

    // Parse the most recently active session, usage from today (midnight local)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sessionPath = path.join(sessionsDir, files[0].f);
    const summary = await parseSessionUsage(sessionPath, todayStart.getTime());

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
