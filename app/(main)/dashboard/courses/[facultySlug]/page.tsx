import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { faculty, course, userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CourseGrid } from "@/components/CourseGrid";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { ContributorCTA } from "@/components/ContributorCTA";
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
    twitter: {
      card: "summary",
      title: `${fac.name} | Libraryyy`,
      description: `Browse ${fac.name} courses`,
    },
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

  // Check if user is a contributor
  let isContributor = false;
  try {
    const { data: session } = await auth.getSession();
    if (session?.user?.id) {
      const profile = await db
        .select({ contributorVerifiedAt: userProfile.contributorVerifiedAt })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1);
      isContributor = !!profile[0]?.contributorVerifiedAt;
    }
  } catch {
    // Ignore
  }

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
            <ContributorCTA
              heading="No Courses Yet"
              subtext={`Be the first to request a course for ${fac.name}. Contribute your materials and we'll create study resources.`}
              href={`/dashboard/contribute?facultySlug=${facultySlug}`}
              imageHeight={200}
              variant="full"
              isContributor={isContributor}
            />
          ) : (
            <>
              <CourseGrid
                courses={courses}
                hrefPrefix={`/dashboard/courses/${facultySlug}`}
              />

              {/* Persistent CTA below course grid */}
              <ContributorCTA
                heading="Can't Find Your Course?"
                subtext="Help us grow this library. Contribute your notes and materials."
                href={`/dashboard/contribute?facultySlug=${facultySlug}`}
                imageHeight={120}
                variant="compact"
                isContributor={isContributor}
              />
            </>
          )}
        </div>
      </div>
      <BackButton href="/dashboard/courses" label="All Faculties" floating />
    </div>
  );
}
