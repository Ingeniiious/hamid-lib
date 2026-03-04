import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { sql } from "drizzle-orm";
import { MajorCard } from "@/components/MajorCard";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { slugify } from "@/lib/slugify";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses",
  robots: { index: false },
};

export default async function CoursesPage() {
  const majors = await db
    .select({
      major: course.major,
      count: sql<number>`count(*)::int`,
    })
    .from(course)
    .groupBy(course.major)
    .orderBy(course.major);

  return (
    <div className="mx-auto max-w-5xl px-6 pb-12">
      <BackButton href="/dashboard" label="Dashboard" />

      <PageHeader title="Courses" subtitle="Browse by major" />

      {majors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
            No Courses Yet
          </h2>
          <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
            Courses will appear here once they&apos;re added.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {majors.map((m, index) => (
            <MajorCard
              key={m.major}
              name={m.major || "General"}
              slug={slugify(m.major || "general")}
              courseCount={m.count}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
