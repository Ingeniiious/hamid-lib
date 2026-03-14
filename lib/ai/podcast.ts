// ---------------------------------------------------------------------------
// Podcast Audio Generation Pipeline
//
// Orchestrates audio generation for a published podcast_script:
//   1. Reads the podcast script content from the generated_content row
//   2. Calls ElevenLabs Text-to-Dialogue API (chunked, multi-speaker)
//   3. Uploads the MP3 audio to Cloudflare R2
//   4. Updates the generated_content row with media fields
// ---------------------------------------------------------------------------

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { generatePodcastAudio } from "./providers/elevenlabs";
import type { PodcastScriptContent } from "./types";

// ── R2 upload config ────────────────────────────────────────────────────────

const R2_CDN_URL = "https://lib.thevibecodedcompany.com";
const R2_BUCKET = "hamid-lib-assets";

function getCloudflareConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env vars"
    );
  }
  return { accountId, apiToken };
}

/**
 * Upload a binary buffer to Cloudflare R2 via the Cloudflare API.
 *
 * PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket}/objects/{key}
 */
async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const { accountId, apiToken } = getCloudflareConfig();

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${R2_BUCKET}/objects/${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `R2 upload failed (${response.status}): ${errorText}`
    );
  }
}

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

  // 3. Generate audio via ElevenLabs Text-to-Dialogue API
  const result = await generatePodcastAudio(script.segments, {
    language: row.language,
  });

  console.log(
    `[podcast] Audio generated — ${result.totalCharacters} chars, ${result.chunks} chunks`
  );

  // 4. Upload to R2
  const mediaKey = `audio/podcasts/${contentId}.mp3`;
  await uploadToR2(mediaKey, result.audio, "audio/mpeg");

  const mediaUrl = `${R2_CDN_URL}/${mediaKey}`;
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
    chunks: result.chunks,
  };
}
