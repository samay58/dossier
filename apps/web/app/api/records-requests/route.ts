import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET() {
  const recordsRequests = await getWorkbenchRepository().listRecordsRequests();
  return NextResponse.json({ recordsRequests });
}

export async function PATCH() {
  return NextResponse.json({ error: "Use a specific request route for status updates." }, { status: 400 });
}

