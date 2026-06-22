import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const candidate = await getWorkbenchRepository().reviewCandidate(id, {
      decision: body.decision,
      reason: typeof body.reason === "string" ? body.reason : "Human review decision.",
      reviewer: typeof body.reviewer === "string" ? body.reviewer : "samay"
    });

    return NextResponse.json(candidate);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Review failed" }, { status: 404 });
  }
}

