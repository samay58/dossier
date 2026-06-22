import { NextResponse } from "next/server";
import { getWorkbenchRepository } from "@/lib/repository";

export async function GET() {
  return NextResponse.json(getWorkbenchRepository().getSettings());
}

