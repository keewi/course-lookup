import { NextRequest, NextResponse } from "next/server";

const SFU_API = "http://www.sfu.ca/bin/wcm/course-outlines";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const department = searchParams.get("department")?.toLowerCase();
  const courseNumber = searchParams.get("courseNumber");
  const year = searchParams.get("year") || "2025";
  const term = searchParams.get("term") || "spring";

  if (!department || !courseNumber) {
    return NextResponse.json(
      { error: "department and courseNumber are required" },
      { status: 400 }
    );
  }

  const sectionsUrl = `${SFU_API}?${year}/${term}/${department}/${courseNumber}`;
  const sectionsRes = await fetch(sectionsUrl);

  if (!sectionsRes.ok) {
    return NextResponse.json(
      { error: "Course not found. Check the department code and course number." },
      { status: 404 }
    );
  }

  const sections = await sectionsRes.json();

  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json(
      { error: "No sections found for this course." },
      { status: 404 }
    );
  }

  const firstLecture = sections.find(
    (s: { sectionCode?: string }) => s.sectionCode === "LEC"
  ) || sections[0];

  const detailUrl = `${SFU_API}?${year}/${term}/${department}/${courseNumber}/${firstLecture.value}`;
  const detailRes = await fetch(detailUrl);

  if (!detailRes.ok) {
    return NextResponse.json(
      { error: "Could not fetch course details." },
      { status: 500 }
    );
  }

  const detail = await detailRes.json();

  return NextResponse.json({
    title: detail.info?.title || firstLecture.title,
    description: detail.info?.description || "",
    prerequisites: detail.info?.prerequisites || "",
    units: detail.info?.units || "",
    deliveryMethod: detail.info?.deliveryMethod || "",
    notes: detail.info?.notes || "",
    department: department.toUpperCase(),
    courseNumber,
    sections: sections.map((s: { text: string; sectionCode?: string; title?: string }) => ({
      section: s.text,
      type: s.sectionCode || "",
      title: s.title || "",
    })),
    instructor: detail.instructor
      ? detail.instructor.map((i: { firstName?: string; lastName?: string }) =>
          `${i.firstName || ""} ${i.lastName || ""}`.trim()
        )
      : [],
    schedule: detail.courseSchedule || [],
  });
}
