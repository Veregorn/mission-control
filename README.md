# 🛰️ Mission Control — OpenClaw Dashboard

A local web dashboard for visualizing and managing AI agent tasks, cron jobs, and memory logs from [OpenClaw](https://github.com/openclaw).

## Features

- **Task Board** — Kanban-style view of pending/completed tasks from Obsidian project notes
- **Memory Log** — Browse daily memory files with excerpts and sizes
- **Cron Calendar** — View scheduled automation jobs (coming soon)
- **Status Bar** — Real-time agent status overview

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Local filesystem** — reads directly from OpenClaw's memory and Obsidian vault

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Paths are configured in `src/lib/config.ts`. Set `CLAWD_DIR` env var to override the default clawd directory.

## Roadmap

- [ ] Convex integration for real-time updates
- [ ] Cron job visualization with calendar view
- [ ] Memory search with QMD integration
- [ ] Sub-agent tree visualization
- [ ] GitHub Actions for CI

## License

MIT
