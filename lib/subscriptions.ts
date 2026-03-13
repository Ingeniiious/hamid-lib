"use server";

import { db } from "@/lib/db";
import { userSubscription } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function subscribeToCourse(courseId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  await db
    .insert(userSubscription)
    .values({
      userId: session.user.id,
      entityType: "course",
      entityId: courseId,
    })
    .onConflictDoNothing();

  return { success: true };
}

export async function unsubscribeFromCourse(courseId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  await db
    .delete(userSubscription)
    .where(
      and(
        eq(userSubscription.userId, session.user.id),
        eq(userSubscription.entityType, "course"),
        eq(userSubscription.entityId, courseId)
      )
    );

  return { success: true };
}

export async function subscribeToFaculty(facultyId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  await db
    .insert(userSubscription)
    .values({
      userId: session.user.id,
      entityType: "faculty",
      entityId: facultyId,
    })
    .onConflictDoNothing();

  return { success: true };
}

export async function unsubscribeFromFaculty(facultyId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  await db
    .delete(userSubscription)
    .where(
      and(
        eq(userSubscription.userId, session.user.id),
        eq(userSubscription.entityType, "faculty"),
        eq(userSubscription.entityId, facultyId)
      )
    );

  return { success: true };
}

export async function isSubscribed(
  entityType: "course" | "faculty",
  entityId: string
): Promise<boolean> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return false;

  const [row] = await db
    .select({ id: userSubscription.id })
    .from(userSubscription)
    .where(
      and(
        eq(userSubscription.userId, session.user.id),
        eq(userSubscription.entityType, entityType),
        eq(userSubscription.entityId, entityId)
      )
    )
    .limit(1);

  return !!row;
}

export async function getUserSubscriptions() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return [];

  return db
    .select()
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id));
}

/**
 * Get all subscriber user IDs for a given entity.
 * Used by the pipeline to notify subscribers when content is published.
 */
export async function getSubscriberIds(
  entityType: "course" | "faculty",
  entityId: string
): Promise<string[]> {
  const rows = await db
    .select({ userId: userSubscription.userId })
    .from(userSubscription)
    .where(
      and(
        eq(userSubscription.entityType, entityType),
        eq(userSubscription.entityId, entityId)
      )
    );

  return rows.map((r) => r.userId);
}
