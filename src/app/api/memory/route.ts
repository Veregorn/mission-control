import { NextResponse } from "next/server";
import { PATHS } from "@/lib/config";
import { listMemoryFiles } from "@/lib/parsers";

export async function GET() {
  try {
    const memories = listMemoryFiles(PATHS.memoryDir);
    return NextResponse.json({ memories, count: memories.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read memory", detail: String(error) },
      { status: 500 }
    );
  }
}
