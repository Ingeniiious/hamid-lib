import { db } from "@/lib/db";
import { faculty, course } from "@/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CourseGrid } from "@/components/CourseGrid";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ facultySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facultySlug } = await params;

  const fac = await db
    .select({ name: faculty.name })
    .from(faculty)
    .where(eq(faculty.slug, facultySlug))
    .then((rows) => rows[0]);

  if (!fac) return { title: "Faculty Not Found", robots: { index: false } };

  return {
    title: fac.name,
    description: `${fac.name} courses on Libraryyy`,
    openGraph: {
      title: `${fac.name} | Libraryyy`,
      description: `Browse ${fac.name} courses`,
    },
    robots: { index: false },
  };
}

export default async function FacultyCoursesPage({ params }: Props) {
  const { facultySlug } = await params;

  const fac = await db
    .select()
    .from(faculty)
    .where(eq(faculty.slug, facultySlug))
    .then((rows) => rows[0]);

  if (!fac) notFound();

  const courses = await db
    .select()
    .from(course)
    .where(eq(course.facultyId, fac.id))
    .orderBy(course.title);

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={fac.name}
          subtitle={`${courses.length} ${courses.length === 1 ? "Course" : "Courses"}`}
        />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-32 text-center">
              <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
                No Courses Yet
              </h2>
              <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
                Courses for {fac.name} will appear here once they&apos;re added.
              </p>
            </div>
          ) : (
            <CourseGrid
              courses={courses}
              hrefPrefix={`/dashboard/courses/${facultySlug}`}
            />
          )}

          {/* Request link */}
          <div className="mt-8 text-center">
            <a
              href="/dashboard/contribute"
              className="text-sm text-gray-900/40 underline hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60"
            >
              Can&apos;t Find Your Course?
            </a>
          </div>
        </div>
      </div>
      <BackButton href="/dashboard/courses" label="All Faculties" floating />
    </div>
  );
}
