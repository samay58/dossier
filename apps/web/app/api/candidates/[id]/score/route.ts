import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getWorkbenchRepository().getCandidate(id);

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json(candidate.score);
}

