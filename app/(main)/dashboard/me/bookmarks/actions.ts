"use server";

import { db } from "@/lib/db";
import { userSubscription, course, faculty, program } from "@/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export type FollowedCourse = {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  semester: string | null;
  professor: string | null;
  coverImage: string | null;
  translations: Record<string, { title?: string; description?: string }> | null;
  facultyName: string | null;
  facultySlug: string | null;
  programName: string | null;
  followedAt: Date;
};

export async function getFollowedCourses(): Promise<FollowedCourse[]> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return [];

  const subs = await db
    .select()
    .from(userSubscription)
    .where(
      and(
        eq(userSubscription.userId, session.user.id),
        eq(userSubscription.entityType, "course")
      )
    );

  if (subs.length === 0) return [];

  const courseIds = subs.map((s) => s.entityId);

  const courses = await db
    .select({
      id: course.id,
      title: course.title,
      description: course.description,
      slug: course.slug,
      semester: course.semester,
      professor: course.professor,
      coverImage: course.coverImage,
      translations: course.translations,
      facultyName: faculty.name,
      facultySlug: faculty.slug,
      programName: program.name,
    })
    .from(course)
    .leftJoin(faculty, eq(course.facultyId, faculty.id))
    .leftJoin(program, eq(course.programId, program.id))
    .where(inArray(course.id, courseIds));

  // Map followedAt from subscription
  const subMap = new Map(subs.map((s) => [s.entityId, s.createdAt]));

  return courses.map((c) => ({
    ...c,
    followedAt: subMap.get(c.id) ?? new Date(),
  }));
}
