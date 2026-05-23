import { NextRequest, NextResponse } from "next/server";

const SFU_API = "http://www.sfu.ca/bin/wcm/course-outlines";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year") || "2025";
  const term = searchParams.get("term") || "spring";

  const res = await fetch(`${SFU_API}?${year}/${term}`);

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }

  const data = await res.json();
  const departments = data
    .filter((d: { name?: string }) => d.name)
    .map((d: { text: string; value: string; name: string }) => ({
      code: d.text,
      name: d.name,
    }));

  return NextResponse.json(departments);
}
