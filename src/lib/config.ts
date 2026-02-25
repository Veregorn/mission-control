// Paths to OpenClaw/Serman data sources
export const PATHS = {
  clawdDir: process.env.CLAWD_DIR || "/Users/rjbarco/clawd",
  memoryDir: process.env.CLAWD_DIR
    ? `${process.env.CLAWD_DIR}/memory`
    : "/Users/rjbarco/clawd/memory",
  projectLogs: process.env.CLAWD_DIR
    ? `${process.env.CLAWD_DIR}/memory/project-logs`
    : "/Users/rjbarco/clawd/memory/project-logs",
  obsidianProjects:
    "/Users/rjbarco/Documents/obsidian-vault/Veregorn/01 Proyectos",
  taskInbox:
    "/Users/rjbarco/Documents/obsidian-vault/Veregorn/Task Inbox.md",
  priorities: process.env.CLAWD_DIR
    ? `${process.env.CLAWD_DIR}/PRIORITIES.md`
    : "/Users/rjbarco/clawd/PRIORITIES.md",
};
