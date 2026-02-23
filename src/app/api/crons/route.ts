import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    // Read crons from OpenClaw gateway
    const output = execSync("openclaw cron list --json 2>/dev/null || echo '[]'", {
      encoding: "utf-8",
      timeout: 5000,
    });

    let crons = [];
    try {
      crons = JSON.parse(output);
    } catch {
      // If JSON parse fails, try plain text parsing
      crons = [];
    }

    return NextResponse.json({ crons });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read crons", detail: String(error) },
      { status: 500 }
    );
  }
}
