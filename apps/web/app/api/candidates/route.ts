import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET(request: Request) {
  const queryRunId = new URL(request.url).searchParams.get("queryRunId") ?? undefined;
  const candidates = await getWorkbenchRepository().listCandidates({ queryRunId });
  return NextResponse.json({ candidates });
}
