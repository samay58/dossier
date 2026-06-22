import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Transcript retrieval is planned for Phase 2 and is not enabled in this MVP." }, { status: 501 });
}

