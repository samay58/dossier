import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryRun = await getWorkbenchRepository().getSweep(id);

  if (!queryRun) {
    return NextResponse.json({ error: "Sweep not found" }, { status: 404 });
  }

  return NextResponse.json(queryRun);
}

