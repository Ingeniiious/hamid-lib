import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { faculty, course, program, userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FacultyCoursesContent } from "@/components/FacultyCoursesContent";
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
    .select({
      id: course.id,
      title: course.title,
      slug: course.slug,
      professor: course.professor,
      semester: course.semester,
      programName: program.name,
    })
    .from(course)
    .leftJoin(program, eq(course.programId, program.id))
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
    <FacultyCoursesContent
      faculty={{ id: fac.id, name: fac.name, slug: fac.slug, translations: fac.translations }}
      courses={courses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        professor: c.professor,
        semester: c.semester,
        programName: c.programName,
      }))}
      facultySlug={facultySlug}
      isContributor={isContributor}
    />
  );
}
