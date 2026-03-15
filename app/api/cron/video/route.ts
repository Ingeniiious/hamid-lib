// ---------------------------------------------------------------------------
// Video Generation Cron Handler
//
// Two jobs per invocation (priority order):
//   1. Original videos: published video_script content without video → full gen
//   2. Translated videos: completed video_script translations without media
//      → reuse English scene images, generate only target-language audio
//
// Processes ONE item per invocation to stay within Vercel timeout.
// After successful generation, notifies course subscribers.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent, contentTranslation } from "@/database/schema";
import {
  generateVideoForContent,
  generateTranslatedVideo,
  findPendingTranslatedVideo,
} from "@/lib/ai/video";
import { dispatchNotification } from "@/lib/notification-dispatch";
import { getSubscriberIds } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — video generation can be slow
export const dynamic = "force-dynamic";

// ── Notify course subscribers that a video is ready ─────────────────────────

async function notifyVideoReady(
  courseId: string,
  contentId: string,
  type: "original" | "translated",
  language?: string
) {
  try {
    const subscriberIds = await getSubscriberIds("course", courseId);
    if (subscriberIds.length === 0) return;

    const body =
      type === "translated" && language
        ? `A new ${language} video is now available for a course you follow.`
        : "A new video is now available for a course you follow.";

    for (const userId of subscriberIds) {
      await dispatchNotification(userId, {
        category: "course_update",
        title: "Video Available",
        body,
        url: `/dashboard/courses`,
        metadata: { courseId, contentId, mediaType: "video" },
      });
    }

    console.log(
      `[video-cron] Notified ${subscriberIds.length} subscribers (${type})`
    );
  } catch (err) {
    // Non-fatal — video was generated successfully, notification is best-effort
    console.log(
      `[video-cron] Failed to notify subscribers: ${(err as Error).message}`
    );
  }
}

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
    // Priority 1: Original videos (need full image + audio gen)
    const [pendingOriginal] = await db
      .select({
        id: generatedContent.id,
        courseId: generatedContent.courseId,
      })
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.contentType, "video_script"),
          eq(generatedContent.isPublished, true),
          isNull(generatedContent.mediaUrl)
        )
      )
      .orderBy(asc(generatedContent.createdAt))
      .limit(1);

    if (pendingOriginal) {
      console.log(`[video-cron] Processing original video ${pendingOriginal.id}`);

      const result = await generateVideoForContent(pendingOriginal.id);

      // Notify course subscribers
      if (pendingOriginal.courseId) {
        await notifyVideoReady(
          pendingOriginal.courseId,
          pendingOriginal.id,
          "original"
        );
      }

      return NextResponse.json({
        processed: true,
        type: "original",
        contentId: pendingOriginal.id,
        mediaUrl: result.mediaUrl,
        mediaSize: result.mediaSize,
        totalScenes: result.totalScenes,
      });
    }

    // Priority 2: Translated videos (reuse images, generate audio only)
    const pendingTranslation = await findPendingTranslatedVideo();

    if (pendingTranslation) {
      console.log(`[video-cron] Processing translated video ${pendingTranslation.id}`);

      const result = await generateTranslatedVideo(pendingTranslation.id);

      // Fetch courseId + language for notification
      const [translation] = await db
        .select({
          targetLanguage: contentTranslation.targetLanguage,
          courseId: generatedContent.courseId,
        })
        .from(contentTranslation)
        .innerJoin(
          generatedContent,
          eq(contentTranslation.contentId, generatedContent.id)
        )
        .where(eq(contentTranslation.id, pendingTranslation.id))
        .limit(1);

      if (translation?.courseId) {
        await notifyVideoReady(
          translation.courseId,
          pendingTranslation.id,
          "translated",
          translation.targetLanguage
        );
      }

      return NextResponse.json({
        processed: true,
        type: "translated",
        translationId: pendingTranslation.id,
        mediaUrl: result.mediaUrl,
        mediaSize: result.mediaSize,
        totalScenes: result.totalScenes,
      });
    }

    return NextResponse.json({
      processed: false,
      message: "No pending videos to generate",
    });
  } catch (error) {
    console.error("[video-cron] Error:", error);

    // Alert admin if this is a billing/credit error
    const errMsg = error instanceof Error ? error.message : String(error);
    try {
      const { checkAndAlertBilling } = await import("@/lib/admin-alerts");
      await checkAndAlertBilling("Video Pipeline (Gemini/Grok)", errMsg, {
        cron: "/api/cron/video",
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
