// ---------------------------------------------------------------------------
// Podcast Audio Generation Cron Handler
//
// Finds published podcast_script content without audio and generates it.
// Processes ONE per invocation to stay within Vercel timeout.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { generatePodcastAudioForContent } from "@/lib/ai/podcast";

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
      .select({ id: generatedContent.id })
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
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
