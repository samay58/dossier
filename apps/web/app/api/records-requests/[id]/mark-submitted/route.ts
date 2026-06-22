import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Automatic submission is disabled. Mark-submitted tracking will be added after manual request tracking is expanded."
    },
    { status: 501 }
  );
}

