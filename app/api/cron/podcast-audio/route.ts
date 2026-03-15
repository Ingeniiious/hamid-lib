// ---------------------------------------------------------------------------
// Podcast Audio Generation Cron Handler
//
// Finds published podcast_script content without audio and generates it.
// Processes ONE per invocation to stay within Vercel timeout.
// After successful generation, notifies course subscribers.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { generatePodcastAudioForContent } from "@/lib/ai/podcast";
import { dispatchNotification } from "@/lib/notification-dispatch";
import { getSubscriberIds } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — audio generation can be slow
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Find the oldest published podcast_script that has no audio yet
    const [pending] = await db
      .select({
        id: generatedContent.id,
        courseId: generatedContent.courseId,
      })
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.contentType, "podcast_script"),
          eq(generatedContent.isPublished, true),
          isNull(generatedContent.mediaUrl)
        )
      )
      .orderBy(asc(generatedContent.createdAt))
      .limit(1);

    if (!pending) {
      return NextResponse.json({
        processed: false,
        message: "No pending podcast audio to generate",
      });
    }

    console.log(`[podcast-cron] Processing content ${pending.id}`);

    const result = await generatePodcastAudioForContent(pending.id);

    // Notify course subscribers
    if (pending.courseId) {
      try {
        const subscriberIds = await getSubscriberIds("course", pending.courseId);
        for (const userId of subscriberIds) {
          await dispatchNotification(userId, {
            category: "course_update",
            title: "New Podcast Available",
            body: "A new podcast is now available for a course you follow.",
            url: `/dashboard/courses`,
            metadata: {
              courseId: pending.courseId,
              contentId: pending.id,
              mediaType: "podcast",
            },
          });
        }
        console.log(
          `[podcast-cron] Notified ${subscriberIds.length} subscribers`
        );
      } catch (err) {
        console.log(
          `[podcast-cron] Failed to notify subscribers: ${(err as Error).message}`
        );
      }
    }

    return NextResponse.json({
      processed: true,
      contentId: pending.id,
      mediaUrl: result.mediaUrl,
      mediaSize: result.mediaSize,
      totalCharacters: result.totalCharacters,
      chunks: result.chunks,
    });
  } catch (error) {
    console.error("[podcast-cron] Error:", error);

    // Alert admin if this is a billing/credit error
    const errMsg = error instanceof Error ? error.message : String(error);
    try {
      const { checkAndAlertBilling } = await import("@/lib/admin-alerts");
      await checkAndAlertBilling("Podcast Pipeline (Grok TTS)", errMsg, {
        cron: "/api/cron/podcast-audio",
      });
    } catch { /* best-effort */ }

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
