"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { contentRequest, faculty, userProfile } from "@/database/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function submitFacultyRequest({
  facultyName,
}: {
  facultyName: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  if (!facultyName.trim() || facultyName.length > 200) {
    return { error: "Please enter a valid faculty name." };
  }

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`request:${session.user.id}`, 10, 300);
  if (!rl.allowed) return { error: "Too many requests. Please wait." };

  // Prevent duplicate pending requests from same user
  const [existing] = await db
    .select({ id: contentRequest.id })
    .from(contentRequest)
    .where(
      and(
        eq(contentRequest.userId, session.user.id),
        eq(contentRequest.type, "faculty"),
        eq(contentRequest.status, "pending"),
        sql`LOWER(${contentRequest.facultyName}) = LOWER(${facultyName.trim()})`
      )
    )
    .limit(1);

  if (existing) {
    return { error: "You already have a pending request for this faculty." };
  }

  // Get user's university
  const profile = await db
    .select({ university: userProfile.university })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  await db.insert(contentRequest).values({
    userId: session.user.id,
    universityName: profile[0]?.university || null,
    type: "faculty",
    facultyName: facultyName.trim(),
  });

  return { success: true };
}

export async function submitCourseRequest({
  existingFacultyId,
  courseName,
  courseProfessor,
  courseSemester,
}: {
  existingFacultyId: number;
  courseName: string;
  courseProfessor?: string;
  courseSemester?: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  if (!courseName.trim() || courseName.length > 200) {
    return { error: "Please enter a valid course name." };
  }

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`request:${session.user.id}`, 10, 300);
  if (!rl.allowed) return { error: "Too many requests. Please wait." };

  // Verify faculty exists
  const [fac] = await db
    .select({ id: faculty.id })
    .from(faculty)
    .where(eq(faculty.id, existingFacultyId))
    .limit(1);
  if (!fac) return { error: "Faculty not found." };

  // Prevent duplicate pending
  const [existing] = await db
    .select({ id: contentRequest.id })
    .from(contentRequest)
    .where(
      and(
        eq(contentRequest.userId, session.user.id),
        eq(contentRequest.type, "course"),
        eq(contentRequest.status, "pending"),
        sql`LOWER(${contentRequest.courseName}) = LOWER(${courseName.trim()})`,
        eq(contentRequest.existingFacultyId, existingFacultyId)
      )
    )
    .limit(1);

  if (existing) {
    return { error: "You already have a pending request for this course." };
  }

  // Get user's university
  const profile = await db
    .select({ university: userProfile.university })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  await db.insert(contentRequest).values({
    userId: session.user.id,
    universityName: profile[0]?.university || null,
    type: "course",
    existingFacultyId,
    courseName: courseName.trim(),
    courseProfessor: courseProfessor?.trim() || null,
    courseSemester: courseSemester?.trim() || null,
  });

  return { success: true };
}

export async function getMyRequests() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { requests: [] };

  const rows = await db
    .select({
      id: contentRequest.id,
      type: contentRequest.type,
      facultyName: contentRequest.facultyName,
      courseName: contentRequest.courseName,
      status: contentRequest.status,
      reviewNote: contentRequest.reviewNote,
      createdAt: contentRequest.createdAt,
    })
    .from(contentRequest)
    .where(eq(contentRequest.userId, session.user.id))
    .orderBy(desc(contentRequest.createdAt))
    .limit(20);

  return { requests: rows };
}
