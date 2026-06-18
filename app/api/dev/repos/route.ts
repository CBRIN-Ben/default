import { NextResponse } from "next/server";
import { listRepositories } from "@/lib/github/client";

export async function GET() {
  try {
    const repositories = await listRepositories(10);
    return NextResponse.json({ ok: true, count: repositories.length, repositories });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        hint: "Set GITHUB_TOKEN or CONNECTOR_GITHUB in .env.local / Cursor secrets",
      },
      { status: 503 },
    );
  }
}
