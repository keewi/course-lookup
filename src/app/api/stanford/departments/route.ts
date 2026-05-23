import { NextResponse } from "next/server";
import departments from "@/data/stanford-departments.json";

export async function GET() {
  return NextResponse.json(departments);
}
