// ---------------------------------------------------------------------------
// Podcast Audio Generation Pipeline
//
// Orchestrates audio generation for a published podcast_script:
//   1. Reads the podcast script content from the generated_content row
//   2. Calls Grok TTS API (per-segment, multi-voice)
//   3. Uploads the MP3 audio to Cloudflare R2
//   4. Updates the generated_content row with media fields
// ---------------------------------------------------------------------------

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
import { generatePodcastAudioGrok } from "./providers/grok-tts";
import type { PodcastScriptContent } from "./types";

// ── Main pipeline function ──────────────────────────────────────────────────

export async function generatePodcastAudioForContent(contentId: string): Promise<{
  mediaUrl: string;
  mediaKey: string;
  mediaSize: number;
  totalCharacters: number;
  chunks: number;
}> {
  console.log(`[podcast] Generating audio for content ${contentId}...`);

  // 1. Fetch the generated_content row
  const [row] = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.id, contentId))
    .limit(1);

  if (!row) {
    throw new Error(`[podcast] Content not found: ${contentId}`);
  }

  if (row.contentType !== "podcast_script") {
    throw new Error(
      `[podcast] Content ${contentId} is type "${row.contentType}", expected "podcast_script"`
    );
  }

  if (!row.content) {
    throw new Error(`[podcast] Content ${contentId} has no content (null)`);
  }

  // 2. Parse the podcast script content
  const script = row.content as PodcastScriptContent;

  if (!script.segments || script.segments.length === 0) {
    throw new Error(
      `[podcast] Content ${contentId} has no segments in podcast script`
    );
  }

  // 3. Generate audio via Grok TTS API (per-segment, multi-voice)
  const result = await generatePodcastAudioGrok(script.segments, {
    language: row.language,
  });

  console.log(
    `[podcast] Audio generated — ${result.totalCharacters} chars, ${result.segments} segments`
  );

  // 4. Upload to R2 (reuse existing S3-compatible R2 client)
  const mediaKey = `audio/podcasts/${contentId}.mp3`;
  const uploadResult = await uploadToR2(
    new Uint8Array(result.audio),
    mediaKey,
    "audio/mpeg"
  );

  if (!uploadResult.success) {
    throw new Error(`[podcast] R2 upload failed: ${uploadResult.error}`);
  }

  const mediaUrl = uploadResult.url;
  const mediaSize = result.audio.byteLength;

  console.log(
    `[podcast] Uploaded to R2 — ${mediaKey} (${mediaSize} bytes)`
  );

  // 5. Update the generated_content row with media fields
  await db
    .update(generatedContent)
    .set({
      mediaUrl,
      mediaKey,
      mediaType: "audio/mpeg",
      mediaSize,
      updatedAt: new Date(),
    })
    .where(eq(generatedContent.id, contentId));

  console.log(`[podcast] Done — ${mediaUrl}`);

  return {
    mediaUrl,
    mediaKey,
    mediaSize,
    totalCharacters: result.totalCharacters,
    chunks: result.segments,
  };
}
