"use server";

import { db } from "@/lib/db";
import { userBookmark, generatedContent, course } from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function toggleBookmark(contentId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Check if already bookmarked
  const [existing] = await db
    .select({ id: userBookmark.id })
    .from(userBookmark)
    .where(
      and(
        eq(userBookmark.userId, session.user.id),
        eq(userBookmark.contentId, contentId)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(userBookmark).where(eq(userBookmark.id, existing.id));
    return { bookmarked: false };
  }

  await db.insert(userBookmark).values({
    userId: session.user.id,
    contentId,
  });
  return { bookmarked: true };
}

export async function isBookmarked(contentId: string): Promise<boolean> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return false;

  const [row] = await db
    .select({ id: userBookmark.id })
    .from(userBookmark)
    .where(
      and(
        eq(userBookmark.userId, session.user.id),
        eq(userBookmark.contentId, contentId)
      )
    )
    .limit(1);

  return !!row;
}

export async function getUserBookmarks(page = 1, limit = 12) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { bookmarks: [], total: 0 };

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userBookmark)
    .where(eq(userBookmark.userId, session.user.id));

  const rows = await db
    .select({
      id: userBookmark.id,
      contentId: userBookmark.contentId,
      note: userBookmark.note,
      savedAt: userBookmark.createdAt,
      contentTitle: generatedContent.title,
      contentType: generatedContent.contentType,
      courseId: generatedContent.courseId,
      courseTitle: course.title,
    })
    .from(userBookmark)
    .innerJoin(
      generatedContent,
      eq(userBookmark.contentId, generatedContent.id)
    )
    .leftJoin(course, eq(generatedContent.courseId, course.id))
    .where(eq(userBookmark.userId, session.user.id))
    .orderBy(desc(userBookmark.createdAt))
    .limit(limit)
    .offset(offset);

  return { bookmarks: rows, total: countResult.count };
}
