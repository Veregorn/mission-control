// Paths to OpenClaw/Serman data sources
const CLAWD = process.env.CLAWD_DIR || "/Users/rjbarco/clawd";

export const PATHS = {
  clawdDir: CLAWD,
  memoryDir: `${CLAWD}/memory`,
  projectLogs: `${CLAWD}/memory/project-logs`,
  obsidianProjects: "/Users/rjbarco/Documents/obsidian-vault/Veregorn/01 Proyectos",
  taskInbox: "/Users/rjbarco/Documents/obsidian-vault/Veregorn/Task Inbox.md",
  priorities: `${CLAWD}/PRIORITIES.md`,
  goals: `${CLAWD}/goals.json`,
  openclawSessions: "/Users/rjbarco/.openclaw/agents/main/sessions",
};
