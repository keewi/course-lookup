import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache";

export const runtime = "nodejs";

function getClient() {
  const key = process.env.COURSE_LOOKUP_ANTHROPIC_KEY;
  if (!key) {
    throw new Error("COURSE_LOOKUP_ANTHROPIC_KEY is not set");
  }
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, remaining } = rateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before searching again." },
      {
        status: 429,
        headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" },
      }
    );
  }

  const { school, department, courseNumber, title, description, instructors } =
    await req.json();

  const cacheKey = `${school}:${department}:${courseNumber}`.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-Cache": "HIT",
      },
    });
  }

  const schoolName = school === "sfu" ? "Simon Fraser University" : "Stanford University";

  const prompt = `You are helping students learn about a university course. Given the course info below, provide three things:

1. **Instructor Profiles**: For each instructor listed, provide:
   - Their likely faculty profile URL at ${schoolName} (${school === "sfu" ? "use the pattern https://www.sfu.ca/computing/people/faculty/[firstname-lastname].html for CS, or search for their department's people page" : "use https://profiles.stanford.edu/[firstname-lastname]"})
   - A LinkedIn search URL: https://www.linkedin.com/search/results/all/?keywords=[Full Name] ${schoolName}
   - If no instructors are listed, return an empty array.

2. **Student Thoughts**: Search your knowledge for what students commonly say about this course. Include:
   - Common praise and complaints
   - Difficulty level (easy/medium/hard)
   - Workload (hours per week if known)
   - Tips from students who have taken it
   - Reference specific sources like Reddit (r/${school === "sfu" ? "simonfraser" : "stanford"}), course review sites, or word of mouth where applicable.
   - If you don't have specific knowledge about this course, provide general impressions based on the course description and department reputation.

3. **Takeaways**: Based on the course description, syllabus information you may know, and student reviews:
   - **Example Projects**: 3-5 example projects or assignments students typically complete in this course. For each, include a confidence level (High/Medium/Low) indicating how sure you are this is an actual assignment vs. your best guess. Pull from syllabi, student reviews, course websites, or Reddit posts if possible. If you're inferring from the course description, say so.
   - **Marketable Skills**: 5-8 concrete, specific skills a student gains from this course (e.g. "Python programming", "statistical hypothesis testing", "circuit design with SPICE"). Avoid vague skills like "critical thinking" or "problem solving" — focus on things you'd put on a resume.
   - **Jobs**: 4-6 specific job titles this course helps prepare students for. Be concrete (e.g. "Data Analyst", "Backend Software Engineer") not generic (e.g. "various tech roles").

Course info:
- School: ${schoolName}
- Department: ${department}
- Course: ${department} ${courseNumber}
- Title: ${title}
- Description: ${description}
- Instructors: ${instructors.length > 0 ? instructors.join(", ") : "Not listed"}

Respond in JSON format:
{
  "instructorProfiles": [
    {
      "name": "...",
      "facultyUrl": "...",
      "linkedinUrl": "..."
    }
  ],
  "studentThoughts": {
    "summary": "2-3 sentence overview of student sentiment",
    "difficulty": "Easy|Medium|Hard",
    "workloadHours": "estimated hours per week or 'Unknown'",
    "praise": ["point 1", "point 2"],
    "complaints": ["point 1", "point 2"],
    "tips": ["tip 1", "tip 2"],
    "sources": ["where this info comes from"]
  },
  "takeaways": {
    "exampleProjects": [
      {
        "name": "Project name or assignment title",
        "description": "1-2 sentence description",
        "confidence": "High|Medium|Low",
        "source": "Where you got this info (e.g. 'course syllabus', 'Reddit r/stanford', 'inferred from course description')"
      }
    ],
    "marketableSkills": ["skill 1", "skill 2"],
    "jobs": ["Job Title 1", "Job Title 2"]
  }
}

Return ONLY valid JSON, no markdown fences.`;

  try {
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const data = JSON.parse(text);

    setCache(cacheKey, data);

    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-Cache": "MISS",
      },
    });
  } catch (e) {
    console.error("Enrich error:", e);
    return NextResponse.json(
      { error: "Failed to generate enriched course data." },
      { status: 500 }
    );
  }
}
