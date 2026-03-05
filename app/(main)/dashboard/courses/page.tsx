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

  // Get user's university and faculty
  let university: string | null = null;
  let userFacultyId: number | null = null;
  if (userId) {
    const profile = await db
      .select({ university: userProfile.university, facultyId: userProfile.facultyId })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .then((rows) => rows[0]);
    university = profile?.university ?? null;
    userFacultyId = profile?.facultyId ?? null;
  }

  if (!university) {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
          <PageHeader title="Courses" subtitle="Browse by faculty" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
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
        <BackButton href="/dashboard" label="Dashboard" floating />
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
        <PageHeader title={`Courses Of ${university}`} subtitle="Browse by faculty" />
      </div>

      {/* Scrollable content */}
      <div
        className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 pb-24"
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
        ) : (() => {
          const pinnedFaculty = userFacultyId ? faculties.find((f) => f.id === userFacultyId) : null;
          const otherFaculties = pinnedFaculty ? faculties.filter((f) => f.id !== userFacultyId) : faculties;
          return (
            <div className="pt-8">
              {pinnedFaculty && (
                <div className="mb-8">
                  <p className="mb-3 text-center text-sm font-medium text-gray-900/40 dark:text-white/40">
                    Your Faculty
                  </p>
                  <div className="mx-auto max-w-xs">
                    <FacultyCard
                      name={pinnedFaculty.name}
                      slug={pinnedFaculty.slug}
                      illustration={pinnedFaculty.illustration}
                      courseCount={pinnedFaculty.courseCount}
                      index={0}
                      highlighted
                    />
                  </div>
                </div>
              )}
              {otherFaculties.length > 0 && (
                <>
                  {pinnedFaculty && (
                    <p className="mb-3 text-center text-sm font-medium text-gray-900/40 dark:text-white/40">
                      All Faculties
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {otherFaculties.map((f, index) => (
                      <FacultyCard
                        key={f.id}
                        name={f.name}
                        slug={f.slug}
                        illustration={f.illustration}
                        courseCount={f.courseCount}
                        index={pinnedFaculty ? index + 1 : index}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
