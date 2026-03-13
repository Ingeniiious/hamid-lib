"use server";

import { db } from "@/lib/db";
import { notificationPreference } from "@/database/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export type NotificationPrefs = typeof notificationPreference.$inferSelect;

const DEFAULTS: Omit<NotificationPrefs, "userId" | "updatedAt"> = {
  contributionPush: true,
  contributionEmail: true,
  courseUpdatePush: true,
  courseUpdateEmail: false,
  facultyUpdatePush: true,
  facultyUpdateEmail: false,
  systemPush: true,
  systemEmail: false,
  weeklyDigestEmail: false,
  mutedUntil: null,
};

export async function getNotificationPreferences(): Promise<NotificationPrefs | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return null;

  const [prefs] = await db
    .select()
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, session.user.id))
    .limit(1);

  if (!prefs) {
    // Return defaults with user's id
    return {
      userId: session.user.id,
      ...DEFAULTS,
      updatedAt: new Date(),
    } as NotificationPrefs;
  }

  return prefs;
}

export async function updateNotificationPreference(
  key: string,
  value: boolean
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Validate key
  const allowedKeys = [
    "contributionPush",
    "contributionEmail",
    "courseUpdatePush",
    "courseUpdateEmail",
    "facultyUpdatePush",
    "facultyUpdateEmail",
    "systemPush",
    "systemEmail",
    "weeklyDigestEmail",
  ];
  if (!allowedKeys.includes(key)) return { error: "Invalid preference key." };

  // Upsert
  await db
    .insert(notificationPreference)
    .values({
      userId: session.user.id,
      ...DEFAULTS,
      [key]: value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreference.userId,
      set: { [key]: value, updatedAt: new Date() },
    });

  return { success: true };
}

export async function toggleMuteAll(mute: boolean) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const mutedUntil = mute
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    : null;

  await db
    .insert(notificationPreference)
    .values({
      userId: session.user.id,
      ...DEFAULTS,
      mutedUntil,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationPreference.userId,
      set: { mutedUntil, updatedAt: new Date() },
    });

  return { success: true };
}
