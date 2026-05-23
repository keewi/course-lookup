"use client";

import { useState, useEffect } from "react";

type School = "sfu" | "stanford";

interface Department {
  code: string;
  name: string;
}

interface CourseResult {
  title: string;
  description: string;
  prerequisites: string;
  units: string;
  deliveryMethod?: string;
  grading?: string;
  notes?: string;
  department: string;
  courseNumber: string;
  instructor: string[];
}

interface InstructorProfile {
  name: string;
  facultyUrl: string;
  linkedinUrl: string;
}

interface StudentThoughts {
  summary: string;
  difficulty: string;
  workloadHours: string;
  praise: string[];
  complaints: string[];
  tips: string[];
  sources: string[];
}

interface ExampleProject {
  name: string;
  description: string;
  confidence: string;
  source: string;
}

interface Takeaways {
  exampleProjects: ExampleProject[];
  marketableSkills: string[];
  jobs: string[];
}

interface EnrichData {
  instructorProfiles: InstructorProfile[];
  studentThoughts: StudentThoughts;
  takeaways: Takeaways;
}

const SCHOOL_LABELS: Record<School, string> = {
  stanford: "Stanford",
  sfu: "Simon Fraser University (SFU)",
};

export default function Home() {
  const [school, setSchool] = useState<School>("stanford");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState("CS");
  const [courseNumber, setCourseNumber] = useState("106A");
  const [result, setResult] = useState<CourseResult | null>(null);
  const [enrichData, setEnrichData] = useState<EnrichData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!initialLoad) {
      setDepartment("");
      setCourseNumber("");
    }
    setInitialLoad(false);
    setResult(null);
    setEnrichData(null);
    setError("");
    setDeptsLoading(true);

    const url =
      school === "sfu" ? "/api/departments" : "/api/stanford/departments";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a: Department, b: Department) =>
          a.code.localeCompare(b.code)
        );
        setDepartments(sorted);
      })
      .catch(() => setDepartments([]))
      .finally(() => setDeptsLoading(false));
  }, [school]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!department || !courseNumber) return;

    setLoading(true);
    setError("");
    setResult(null);
    setEnrichData(null);

    const url =
      school === "sfu"
        ? `/api/courses?department=${encodeURIComponent(department)}&courseNumber=${encodeURIComponent(courseNumber.trim())}`
        : `/api/stanford/courses?department=${encodeURIComponent(department)}&courseNumber=${encodeURIComponent(courseNumber.trim())}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);

      setEnrichLoading(true);
      try {
        const enrichRes = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school,
            department: data.department,
            courseNumber: data.courseNumber,
            title: data.title,
            description: data.description,
            instructors: data.instructor,
          }),
        });
        if (enrichRes.ok) {
          setEnrichData(await enrichRes.json());
        }
      } catch {
        // Enrichment is best-effort
      } finally {
        setEnrichLoading(false);
      }
    } catch {
      setError("Failed to fetch course data. Please try again.");
      setLoading(false);
    }
  }

  function stripHtml(html: string) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Course Lookup
          </h1>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-lg text-zinc-600 dark:text-zinc-400">
            <span>Search</span>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value as School)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-base font-medium text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {Object.entries(SCHOOL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span>courses by department and course number.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={deptsLoading}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 disabled:opacity-50"
          >
            <option value="">
              {deptsLoading ? "Loading departments..." : "Select a department"}
            </option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Course number (e.g. 120, 106A)"
            value={courseNumber}
            onChange={(e) => setCourseNumber(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />

          <button
            type="submit"
            disabled={!department || !courseNumber || loading}
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Searching..." : "Look Up Course"}
          </button>
        </form>

        {error && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="w-full space-y-6">
            {/* Course Info Card */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {result.department} {result.courseNumber} — {result.title}
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">
                {result.units && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {result.units} units
                  </span>
                )}
                {result.deliveryMethod && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    {result.deliveryMethod}
                  </span>
                )}
                {result.grading && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {result.grading}
                  </span>
                )}
              </div>

              {result.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Description
                  </h3>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {stripHtml(result.description).trim()}
                  </p>
                </div>
              )}

              {result.prerequisites && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Prerequisites
                  </h3>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {stripHtml(result.prerequisites).trim()}
                  </p>
                </div>
              )}

              {result.notes && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Notes
                  </h3>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {stripHtml(result.notes).trim()}
                  </p>
                </div>
              )}
            </div>

            {/* Instructor Profiles Card */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Instructor Profiles
              </h3>
              {enrichLoading ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
                  Loading instructor info...
                </p>
              ) : enrichData?.instructorProfiles &&
                enrichData.instructorProfiles.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {enrichData.instructorProfiles.map((prof, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {prof.name}
                      </span>
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={prof.facultyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Faculty Profile
                        </a>
                        <a
                          href={prof.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          LinkedIn
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !enrichLoading ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  No instructor information available for this term.
                </p>
              ) : null}
            </div>

            {/* Student Thoughts Card */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Student Thoughts
              </h3>
              {enrichLoading ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
                  Gathering student perspectives...
                </p>
              ) : enrichData?.studentThoughts ? (
                <div className="mt-3 space-y-4">
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {enrichData.studentThoughts.summary}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Difficulty: {enrichData.studentThoughts.difficulty}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      Workload: {enrichData.studentThoughts.workloadHours} hrs/week
                    </span>
                  </div>

                  {enrichData.studentThoughts.praise.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                        What students like
                      </h4>
                      <ul className="mt-1 space-y-1">
                        {enrichData.studentThoughts.praise.map((p, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="text-green-500 shrink-0">+</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enrichData.studentThoughts.complaints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Common complaints
                      </h4>
                      <ul className="mt-1 space-y-1">
                        {enrichData.studentThoughts.complaints.map((c, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="text-red-500 shrink-0">-</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enrichData.studentThoughts.tips.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        Tips from past students
                      </h4>
                      <ul className="mt-1 space-y-1">
                        {enrichData.studentThoughts.tips.map((t, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="text-blue-500 shrink-0">*</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enrichData.studentThoughts.sources.length > 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Sources: {enrichData.studentThoughts.sources.join(", ")}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Takeaways Card */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Takeaways
              </h3>
              {enrichLoading ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
                  Generating takeaways...
                </p>
              ) : enrichData?.takeaways ? (
                <div className="mt-3 space-y-6">
                  {/* Example Projects */}
                  {enrichData.takeaways.exampleProjects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Example Projects & Assignments
                      </h4>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 italic">
                        These are AI-generated estimates and may not reflect actual assignments. Verify with the course syllabus.
                      </p>
                      <div className="mt-2 space-y-3">
                        {enrichData.takeaways.exampleProjects.map((p, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                                {p.name}
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  p.confidence === "High"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : p.confidence === "Medium"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                                }`}
                              >
                                {p.confidence} confidence
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {p.description}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                              Source: {p.source}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marketable Skills */}
                  {enrichData.takeaways.marketableSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Marketable Skills
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {enrichData.takeaways.marketableSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Jobs */}
                  {enrichData.takeaways.jobs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Jobs This Prepares You For
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {enrichData.takeaways.jobs.map((job, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
                          >
                            {job}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
