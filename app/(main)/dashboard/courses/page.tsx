import { db } from "@/lib/db";
import { faculty, course, userProfile } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { FacultyCard } from "@/components/FacultyCard";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 300; // Cache for 5 min — faculties rarely change

export const metadata: Metadata = {
  title: "Courses",
  robots: { index: false },
};

export default async function CoursesPage() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  // Get user's university
  let university: string | null = null;
  if (userId) {
    const profile = await db
      .select({ university: userProfile.university })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .then((rows) => rows[0]);
    university = profile?.university ?? null;
  }

  if (!university) {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
          <BackButton href="/dashboard" label="Dashboard" />
          <PageHeader title="Courses" subtitle="Browse by faculty" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
            Set Your University
          </h2>
          <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
            Set your university in settings to see available faculties.
          </p>
          <Link
            href="/dashboard/users"
            className="mt-4 rounded-full border border-gray-900/10 px-6 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
          >
            Go To Settings
          </Link>
        </div>
      </div>
    );
  }

  // Query faculties for user's university with course counts
  const faculties = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      slug: faculty.slug,
      illustration: faculty.illustration,
      courseCount: sql<number>`count(${course.id})::int`,
    })
    .from(faculty)
    .leftJoin(course, eq(course.facultyId, faculty.id))
    .where(eq(faculty.university, university))
    .groupBy(faculty.id)
    .orderBy(faculty.displayOrder);

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <BackButton href="/dashboard" label="Dashboard" />
        <PageHeader title={`Courses Of ${university}`} subtitle="Browse by faculty" />
      </div>

      {/* Scrollable content */}
      <div
        className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 pb-12"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        {faculties.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-40 text-center">
            <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
              No Faculties Yet
            </h2>
            <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
              Faculties for {university} will appear here once they&apos;re added.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {faculties.map((f, index) => (
              <FacultyCard
                key={f.id}
                name={f.name}
                slug={f.slug}
                illustration={f.illustration}
                courseCount={f.courseCount}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
