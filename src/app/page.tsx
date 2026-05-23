"use client";

import { useState } from "react";

export default function Home() {
  const [school, setSchool] = useState("");
  const [course, setCourse] = useState("");

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Course Lookup
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Enter your school and a course name or number to get started.
          </p>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex w-full flex-col gap-4"
        >
          <input
            type="text"
            placeholder="School (e.g. UCLA, MIT, Stanford)"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
          <input
            type="text"
            placeholder="Course name or number (e.g. CS 101, Intro to Biology)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            Look Up Course
          </button>
        </form>
      </main>
    </div>
  );
}
