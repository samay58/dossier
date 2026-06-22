import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Media storage requires explicit human approval and is not implemented in the MVP." }, { status: 501 });
}

