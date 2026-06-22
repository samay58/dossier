import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Interrogation-signal analysis is planned for Phase 2 and is not enabled in this MVP." }, { status: 501 });
}

