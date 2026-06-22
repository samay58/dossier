import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const repository = getWorkbenchRepository();
  const query = typeof body.query === "string" && body.query.trim() ? body.query.trim() : "jury views interrogation video";
  const queryFamily = typeof body.queryFamily === "string" ? body.queryFamily : "court_media";
  const sources = Array.isArray(body.sources) ? body.sources : ["seed"];

  try {
    const queryRun = await repository.runSweep({ query, queryFamily, sources });
    return NextResponse.json(queryRun, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sweep failed" }, { status: 500 });
  }
}
