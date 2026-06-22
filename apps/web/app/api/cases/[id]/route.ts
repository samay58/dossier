import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getWorkbenchRepository();
  const caseRecord = await repository.getCase(id);

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const candidates = await repository.listCaseCandidates(id);
  return NextResponse.json({ case: caseRecord, candidates });
}

export async function PATCH() {
  return NextResponse.json({ error: "Case editing is not implemented in the MVP." }, { status: 501 });
}

