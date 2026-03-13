"use server";

import { db } from "@/lib/db";
import {
  inAppNotification,
  notificationPreference,
  userProfile,
  pushSubscription,
} from "@/database/schema";
import { eq } from "drizzle-orm";

type NotificationCategory =
  | "contribution"
  | "course_update"
  | "faculty_update"
  | "system";

interface NotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Central notification dispatcher.
 * Checks user preferences and fans out to in-app, push, and email channels.
 */
export async function dispatchNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    // 1. Load preferences (defaults: all push on, contribution email on, others off)
    const [prefs] = await db
      .select()
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, userId))
      .limit(1);

    // Check if muted
    if (prefs?.mutedUntil && new Date(prefs.mutedUntil) > new Date()) {
      return;
    }

    // 2. Always insert in-app notification
    await db.insert(inAppNotification).values({
      userId,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      category: payload.category,
      metadata: payload.metadata ?? null,
    });

    // 3. Push notification (if enabled)
    const pushEnabled = isPushEnabled(prefs, payload.category);
    if (pushEnabled) {
      try {
        const { sendPushNotification } = await import("@/lib/web-push");
        // Get user's push subscriptions
        const subs = await db
          .select()
          .from(pushSubscription)
          .where(eq(pushSubscription.userId, userId));

        for (const sub of subs) {
          if (!sub.p256dh || !sub.auth) continue;
          await sendPushNotification(sub as typeof sub & { p256dh: string; auth: string }, {
            title: payload.title,
            body: payload.body,
            url: payload.url,
          });
        }
      } catch (pushErr) {
        console.log(
          `[notification] Push failed for ${userId}: ${(pushErr as Error).message}`
        );
      }
    }

    // 4. Email notification (if enabled)
    const emailEnabled = isEmailEnabled(prefs, payload.category);
    if (emailEnabled) {
      try {
        // Get user's email from auth
        const [profile] = await db
          .select({ language: userProfile.language })
          .from(userProfile)
          .where(eq(userProfile.userId, userId))
          .limit(1);

        // Fetch user email from neon_auth
        const emailResult = await db.execute(
          `SELECT email FROM neon_auth."user" WHERE id = '${userId}' LIMIT 1`
        );
        const userEmail = (emailResult as any)?.[0]?.email;

        if (userEmail) {
          const { buildNotificationEmail } = await import(
            "@/lib/notification-email-templates"
          );
          const { sendEmail } = await import("@/lib/email");

          const email = buildNotificationEmail({
            title: payload.title,
            body: payload.body,
            ctaText: "View Details",
            ctaUrl: payload.url,
          });

          await sendEmail({
            to: userEmail,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        }
      } catch (emailErr) {
        console.log(
          `[notification] Email failed for ${userId}: ${(emailErr as Error).message}`
        );
      }
    }
  } catch (e) {
    console.log(
      `[notification] Dispatch failed for ${userId}: ${(e as Error).message}`
    );
  }
}

/**
 * Dispatch notifications to multiple users (for subscriber fan-out).
 */
export async function dispatchBulkNotifications(
  userIds: string[],
  payload: NotificationPayload
): Promise<void> {
  // Process in parallel with a concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((uid) => dispatchNotification(uid, payload))
    );
  }
}

// ---------------------------------------------------------------------------
// Preference helpers
// ---------------------------------------------------------------------------

function isPushEnabled(
  prefs: typeof notificationPreference.$inferSelect | undefined,
  category: NotificationCategory
): boolean {
  if (!prefs) {
    // Defaults: all push enabled
    return true;
  }
  switch (category) {
    case "contribution":
      return prefs.contributionPush;
    case "course_update":
      return prefs.courseUpdatePush;
    case "faculty_update":
      return prefs.facultyUpdatePush;
    case "system":
      return prefs.systemPush;
    default:
      return true;
  }
}

function isEmailEnabled(
  prefs: typeof notificationPreference.$inferSelect | undefined,
  category: NotificationCategory
): boolean {
  if (!prefs) {
    // Defaults: only contribution email enabled
    return category === "contribution";
  }
  switch (category) {
    case "contribution":
      return prefs.contributionEmail;
    case "course_update":
      return prefs.courseUpdateEmail;
    case "faculty_update":
      return prefs.facultyUpdateEmail;
    case "system":
      return prefs.systemEmail;
    default:
      return false;
  }
}
