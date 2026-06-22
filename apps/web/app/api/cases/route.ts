import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET() {
  const cases = await getWorkbenchRepository().listCases();
  return NextResponse.json({ cases });
}

