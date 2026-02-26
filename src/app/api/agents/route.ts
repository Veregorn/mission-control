import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const HOME = os.homedir();
const SESSIONS_JSON = path.join(HOME, ".openclaw/agents/main/sessions/sessions.json");
const CRONS_JSON = path.join(HOME, ".openclaw/cron/jobs.json");

interface CronJob {
  id: string;
  name: string;
  expr?: string;
}

interface SessionEntry {
  sessionId: string;
  updatedAt: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  role: "main" | "cron" | "subagent" | "voice";
  emoji: string;
  status: "active" | "idle" | "offline";
  lastSeen: number; // epoch ms
  sessionId?: string;
  description?: string;
}

function statusFromAge(ageMs: number): "active" | "idle" | "offline" {
  const h = ageMs / 3_600_000;
  if (h < 0.5) return "active";
  if (h < 6) return "idle";
  return "offline";
}

const CRON_EMOJIS: Record<string, string> = {
  "hourly-memory-summarizer": "🧠",
  "consolidacion-memoria-nocturna": "🌙",
  "daily-briefing-obsidian": "📰",
  "investigacion-nocturna": "🔭",
  "curacion-vault-nocturna": "📚",
  "preprocesado-inbox-nocturno": "📥",
  "proyectos-autonomos-nocturnos": "⚙️",
  "weekly-synthesis": "📊",
  "weekly-task-review": "📋",
  "evening-checkin": "🌆",
  "security-audit-weekly": "🔒",
  "exploracion-personal-serman": "🌍",
  "cumpli-bug-hunter": "🐛",
  "monitor-worktrees": "🌲",
  "architecture-audit-biweekly": "🏛️",
  "recordatorio-lingoda": "🗣️",
};

export async function GET() {
  const now = Date.now();
  const agents: AgentInfo[] = [];

  // 1. Main Serman session
  let sessions: Record<string, SessionEntry> = {};
  try {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_JSON, "utf8"));
  } catch {
    // fallback: empty
  }

  const mainSession = sessions["agent:main:main"];
  agents.push({
    id: "serman",
    name: "Serman",
    role: "main",
    emoji: "👻",
    status: mainSession ? statusFromAge(now - mainSession.updatedAt) : "offline",
    lastSeen: mainSession?.updatedAt ?? 0,
    sessionId: mainSession?.sessionId,
    description: "Agente principal · Telegram",
  });

  // 2. Cron agents — one per job, use most recent run
  let cronJobs: CronJob[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(CRONS_JSON, "utf8"));
    cronJobs = Array.isArray(raw) ? raw : raw.jobs ?? [];
  } catch {
    // fallback
  }

  for (const job of cronJobs) {
    // Find the most recent session for this cron
    const prefix = `agent:main:cron:${job.id}`;
    let latestUpdated = 0;
    let latestSid: string | undefined;

    for (const [key, s] of Object.entries(sessions)) {
      if (key.startsWith(prefix) && s.updatedAt > latestUpdated) {
        latestUpdated = s.updatedAt;
        latestSid = s.sessionId;
      }
    }

    if (latestUpdated === 0) continue; // Never ran

    agents.push({
      id: `cron-${job.id}`,
      name: job.name.replace(/-/g, " "),
      role: "cron",
      emoji: CRON_EMOJIS[job.name] ?? "🤖",
      status: statusFromAge(now - latestUpdated),
      lastSeen: latestUpdated,
      sessionId: latestSid,
      description: job.expr ? `schedule: ${job.expr}` : "scheduled",
    });
  }

  // 3. Spawn subagents (active in last 2h)
  const spawnThreshold = 2 * 3_600_000;
  for (const [key, s] of Object.entries(sessions)) {
    if (key.includes(":spawn:") || (key.includes(":openai:") && now - s.updatedAt < spawnThreshold)) {
      const label = key.split(":").pop() ?? key;
      agents.push({
        id: `sub-${s.sessionId}`,
        name: `Codex ${label.slice(0, 6)}`,
        role: "subagent",
        emoji: "🧩",
        status: statusFromAge(now - s.updatedAt),
        lastSeen: s.updatedAt,
        sessionId: s.sessionId,
        description: "Coding subagent",
      });
    }
  }

  // Sort: active first, then by lastSeen desc
  const order = { active: 0, idle: 1, offline: 2 };
  agents.sort((a, b) => order[a.status] - order[b.status] || b.lastSeen - a.lastSeen);

  return NextResponse.json({ agents, generatedAt: now });
}
