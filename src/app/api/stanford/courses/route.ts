import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const STANFORD_API = "https://explorecourses.stanford.edu/search";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const department = searchParams.get("department")?.toUpperCase();
  const courseNumber = searchParams.get("courseNumber")?.trim();

  if (!department || !courseNumber) {
    return NextResponse.json(
      { error: "department and courseNumber are required" },
      { status: 400 }
    );
  }

  const query = `${department}${courseNumber}`;
  const url = `${STANFORD_API}?view=xml-20200810&q=${encodeURIComponent(query)}&filter-departmentcode-${department}=on&filter-coursestatus-Active=on`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch from Stanford." },
      { status: 502 }
    );
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);

  const courses = parsed?.xml?.courses?.course;
  if (!courses) {
    return NextResponse.json(
      { error: "Course not found. Check the department code and course number." },
      { status: 404 }
    );
  }

  const courseList = Array.isArray(courses) ? courses : [courses];

  const match = courseList.find(
    (c: { code: string }) =>
      String(c.code).toUpperCase() === courseNumber.toUpperCase()
  );

  if (!match) {
    return NextResponse.json(
      { error: `No exact match for ${department} ${courseNumber}. Check the course number.` },
      { status: 404 }
    );
  }

  const sections = match.sections?.section;
  const sectionList = sections
    ? Array.isArray(sections)
      ? sections
      : [sections]
    : [];

  const instructors = new Set<string>();
  const scheduleEntries: { days: string; startTime: string; endTime: string; location: string; component: string }[] = [];

  for (const sec of sectionList) {
    const schedules = sec.schedules?.schedule;
    const schedList = schedules
      ? Array.isArray(schedules)
        ? schedules
        : [schedules]
      : [];

    for (const sched of schedList) {
      const instrList = sched.instructors?.instructor;
      const instrs = instrList
        ? Array.isArray(instrList)
          ? instrList
          : [instrList]
        : [];
      for (const i of instrs) {
        if (i.role === "PI" && i.firstName && i.lastName) {
          instructors.add(`${i.firstName} ${i.lastName}`);
        }
      }

      const days = sched.days;
      const dayStr = typeof days === "string"
        ? days.trim()
        : Array.isArray(days)
          ? days.filter(Boolean).join(", ")
          : Object.values(days || {}).filter(Boolean).join(", ");

      if (sched.startTime) {
        scheduleEntries.push({
          days: dayStr,
          startTime: sched.startTime || "",
          endTime: sched.endTime || "",
          location: sched.location || "",
          component: sec.component || "",
        });
      }
    }
  }

  return NextResponse.json({
    title: match.title || "",
    description: match.description || "",
    prerequisites: "",
    units: match.unitsMin === match.unitsMax
      ? String(match.unitsMin)
      : `${match.unitsMin}-${match.unitsMax}`,
    grading: match.grading || "",
    department,
    courseNumber: String(match.code),
    sections: sectionList.map((s: { sectionNumber: string; component: string; enrollStatus: string; numEnrolled: number; maxEnrolled: number }) => ({
      section: s.sectionNumber || "",
      type: s.component || "",
      status: s.enrollStatus || "",
      enrolled: `${s.numEnrolled || 0}/${s.maxEnrolled || 0}`,
    })),
    instructor: Array.from(instructors),
    schedule: scheduleEntries,
  });
}
