import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { course, faculty, userProfile } from "@/database/schema";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { CourseDetail } from "@/components/CourseDetail";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ facultySlug: string; courseSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) {
    return { title: "Course Not Found", robots: { index: false } };
  }

  return {
    title: c.title,
    description: c.description || `${c.title} on Libraryyy`,
    openGraph: {
      title: `${c.title} | Libraryyy`,
      description: c.description || `${c.title} on Libraryyy`,
    },
    twitter: {
      card: "summary",
      title: `${c.title} | Libraryyy`,
      description: c.description || `${c.title} on Libraryyy`,
    },
  };
}

export default async function CoursePage({ params }: Props) {
  const { facultySlug, courseSlug } = await params;

  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) notFound();

  // Get faculty name for back button
  const fac = await db
    .select({ name: faculty.name })
    .from(faculty)
    .where(eq(faculty.slug, facultySlug))
    .then((rows) => rows[0]);

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
        <PageHeader title={c.title} subtitle={c.description || undefined} />
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
          <CourseDetail course={c} isContributor={isContributor} />
        </div>
      </div>
      <BackButton
        href={`/dashboard/courses/${facultySlug}`}
        label={fac?.name || "Back"}
        floating
      />
    </div>
  );
}
