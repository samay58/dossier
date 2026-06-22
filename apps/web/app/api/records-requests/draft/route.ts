import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const draft = await getWorkbenchRepository().createRecordsRequestDraft({
      caseId: body.caseId,
      requestType: body.requestType ?? "court_clerk",
      feeCapDollars: typeof body.feeCapDollars === "number" ? body.feeCapDollars : 50
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draft failed" }, { status: 400 });
  }
}

