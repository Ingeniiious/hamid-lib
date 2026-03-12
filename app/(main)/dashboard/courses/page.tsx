import { db } from "@/lib/db";
import { faculty, course, userProfile } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { CoursesPageContent } from "@/components/CoursesPageContent";
import type { Metadata } from "next";

export const dynamic = "force-dynamic"; // Per-user content (university profile check)

export const metadata: Metadata = {
  title: "Courses",
  description: "Browse university courses and study materials.",
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

  // Query faculties for user's university with course counts (only if university is set)
  let faculties: {
    id: number;
    name: string;
    slug: string;
    illustration: string | null;
    courseCount: number;
  }[] = [];

  if (university) {
    faculties = await db
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
  }

  return (
    <CoursesPageContent
      university={university}
      userFacultyId={userFacultyId}
      faculties={faculties}
    />
  );
}
