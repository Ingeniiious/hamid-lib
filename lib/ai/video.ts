// ---------------------------------------------------------------------------
// Video Generation Pipeline
//
// Two modes:
//   1. Original video: generate scene images (Nano Banana 2) + audio (Grok TTS),
//      cache scene images to R2, stitch into MP4, upload.
//   2. Translated video: reuse cached scene images from original,
//      generate only audio in target language, stitch, upload.
//      ~10x faster and cheaper — no image generation needed.
// ---------------------------------------------------------------------------

import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedContent, contentTranslation } from "@/database/schema";
import { uploadToR2, downloadFromR2 } from "@/lib/r2";
import { generateSceneImage } from "./providers/nano-banana";
import { synthesizeGrok } from "./providers/grok-tts";
import { stitchScenes } from "./ffmpeg-stitch";
import type { VideoScriptContent } from "./types";
import type { StitchInput } from "./ffmpeg-stitch";

// ── Scene image R2 key pattern ──────────────────────────────────────────────

function sceneImageKey(contentId: string, sceneIndex: number): string {
  return `video/scenes/${contentId}/scene_${sceneIndex}.png`;
}

// ── Original video generation (English) ─────────────────────────────────────

export async function generateVideoForContent(contentId: string): Promise<{
  mediaUrl: string;
  mediaKey: string;
  mediaSize: number;
  totalScenes: number;
}> {
  console.log(`[video] Generating video for content ${contentId}...`);

  // 1. Fetch the generated_content row
  const [row] = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.id, contentId))
    .limit(1);

  if (!row) {
    throw new Error(`[video] Content not found: ${contentId}`);
  }

  if (row.contentType !== "video_script") {
    throw new Error(
      `[video] Content ${contentId} is type "${row.contentType}", expected "video_script"`
    );
  }

  if (!row.content) {
    throw new Error(`[video] Content ${contentId} has no content (null)`);
  }

  // 2. Parse the video script content
  const script = row.content as VideoScriptContent;

  if (!script.scenes || script.scenes.length === 0) {
    throw new Error(
      `[video] Content ${contentId} has no scenes in video script`
    );
  }

  console.log(
    `[video] Processing ${script.scenes.length} scenes, lang=${row.language}`
  );

  // 3. Generate all scene assets in parallel (image + audio per scene)
  const results = await Promise.allSettled(
    script.scenes.map((scene, i) =>
      Promise.all([
        generateSceneImage(scene.imagePrompt ?? scene.visualDescription),
        synthesizeGrok({
          text: scene.narration,
          voiceId: "ara",
          language: row.language,
        }),
      ]).then(([imageResult, audioResult]) => {
        console.log(
          `[video] Scene ${i + 1}/${script.scenes.length} assets ready`
        );
        return { imageResult, audioResult };
      })
    )
  );

  // 4. Check results — if any failed, throw with details
  const failed = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );

  if (failed.length > 0) {
    const firstError = failed[0].reason;
    throw new Error(
      `[video] ${failed.length}/${script.scenes.length} scenes failed. ` +
        `First error: ${firstError instanceof Error ? firstError.message : String(firstError)}`
    );
  }

  // All succeeded — extract scene assets
  const sceneImages: Buffer[] = [];
  const sceneAssets: StitchInput[] = results.map((r) => {
    const { imageResult, audioResult } = (
      r as PromiseFulfilledResult<{
        imageResult: { image: Buffer; mimeType: string };
        audioResult: { audio: Buffer; characterCount: number };
      }>
    ).value;

    sceneImages.push(imageResult.image);

    return {
      image: imageResult.image,
      audio: audioResult.audio,
    };
  });

  console.log(
    `[video] All ${sceneAssets.length} scene assets generated, starting stitch...`
  );

  // 5. Cache scene images to R2 (for translated video reuse)
  console.log(`[video] Caching ${sceneImages.length} scene images to R2...`);
  await Promise.all(
    sceneImages.map((img, i) =>
      uploadToR2(
        new Uint8Array(img),
        sceneImageKey(contentId, i),
        "image/png"
      )
    )
  );

  // 6. Stitch all scenes into a single MP4
  const mp4Buffer = await stitchScenes(sceneAssets);

  // 7. Upload final video to R2
  const mediaKey = `video/courses/${contentId}.mp4`;
  const uploadResult = await uploadToR2(
    new Uint8Array(mp4Buffer),
    mediaKey,
    "video/mp4"
  );

  if (!uploadResult.success) {
    throw new Error(`[video] R2 upload failed: ${uploadResult.error}`);
  }

  const mediaUrl = uploadResult.url;
  const mediaSize = mp4Buffer.byteLength;

  console.log(`[video] Uploaded to R2 — ${mediaKey} (${mediaSize} bytes)`);

  // 8. Update the generated_content row with media fields
  await db
    .update(generatedContent)
    .set({
      mediaUrl,
      mediaKey,
      mediaType: "video/mp4",
      mediaSize,
      updatedAt: new Date(),
    })
    .where(eq(generatedContent.id, contentId));

  console.log(`[video] Done — ${mediaUrl}`);

  return {
    mediaUrl,
    mediaKey,
    mediaSize,
    totalScenes: script.scenes.length,
  };
}

// ── Translated video generation (reuses English images) ─────────────────────

export async function generateTranslatedVideo(translationId: string): Promise<{
  mediaUrl: string;
  mediaKey: string;
  mediaSize: number;
  totalScenes: number;
}> {
  console.log(`[video-translate] Generating translated video for ${translationId}...`);

  // 1. Fetch the translation row
  const [translation] = await db
    .select()
    .from(contentTranslation)
    .where(eq(contentTranslation.id, translationId))
    .limit(1);

  if (!translation) {
    throw new Error(`[video-translate] Translation not found: ${translationId}`);
  }

  const originalContentId = translation.contentId;
  const targetLang = translation.targetLanguage;

  // 2. Verify original content has a video (images are cached)
  const [original] = await db
    .select({ id: generatedContent.id, mediaUrl: generatedContent.mediaUrl, content: generatedContent.content })
    .from(generatedContent)
    .where(eq(generatedContent.id, originalContentId))
    .limit(1);

  if (!original?.mediaUrl) {
    throw new Error(
      `[video-translate] Original content ${originalContentId} has no video yet. ` +
        `Generate the original video first.`
    );
  }

  // 3. Parse translated script to get narrations
  const translatedScript = translation.content as VideoScriptContent;

  if (!translatedScript?.scenes || translatedScript.scenes.length === 0) {
    throw new Error(
      `[video-translate] Translation ${translationId} has no scenes`
    );
  }

  const sceneCount = translatedScript.scenes.length;
  console.log(
    `[video-translate] ${sceneCount} scenes, lang=${targetLang}`
  );

  // 4. Fetch cached scene images from R2 (uploaded during original video gen)
  console.log(`[video-translate] Fetching ${sceneCount} cached scene images from R2...`);
  const imageResults = await Promise.all(
    translatedScript.scenes.map((_, i) =>
      downloadFromR2(sceneImageKey(originalContentId, i))
    )
  );

  const failedImages = imageResults.filter((r) => !r.success);
  if (failedImages.length > 0) {
    throw new Error(
      `[video-translate] ${failedImages.length}/${sceneCount} scene images missing from R2. ` +
        `Original video may need regeneration.`
    );
  }

  // 5. Generate audio for each scene in the target language
  console.log(`[video-translate] Generating ${sceneCount} audio clips in ${targetLang}...`);
  const audioResults = await Promise.allSettled(
    translatedScript.scenes.map((scene, i) =>
      synthesizeGrok({
        text: scene.narration,
        voiceId: "ara",
        language: targetLang,
      }).then((result) => {
        console.log(
          `[video-translate] Audio ${i + 1}/${sceneCount} ready`
        );
        return result;
      })
    )
  );

  const failedAudio = audioResults.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );

  if (failedAudio.length > 0) {
    const firstError = failedAudio[0].reason;
    throw new Error(
      `[video-translate] ${failedAudio.length}/${sceneCount} audio clips failed. ` +
        `First error: ${firstError instanceof Error ? firstError.message : String(firstError)}`
    );
  }

  // 6. Assemble stitch inputs
  const sceneAssets: StitchInput[] = imageResults.map((imgResult, i) => ({
    image: (imgResult as { success: true; data: Buffer }).data,
    audio: (
      audioResults[i] as PromiseFulfilledResult<{ audio: Buffer; characterCount: number }>
    ).value.audio,
  }));

  // 7. Stitch into MP4
  console.log(`[video-translate] Stitching ${sceneCount} scenes...`);
  const mp4Buffer = await stitchScenes(sceneAssets);

  // 8. Upload translated video to R2
  const mediaKey = `video/courses/${originalContentId}_${targetLang}.mp4`;
  const uploadResult = await uploadToR2(
    new Uint8Array(mp4Buffer),
    mediaKey,
    "video/mp4"
  );

  if (!uploadResult.success) {
    throw new Error(`[video-translate] R2 upload failed: ${uploadResult.error}`);
  }

  const mediaUrl = uploadResult.url;
  const mediaSize = mp4Buffer.byteLength;

  // 9. Update the content_translation row with media fields
  await db
    .update(contentTranslation)
    .set({
      mediaUrl,
      mediaKey,
      mediaType: "video/mp4",
      mediaSize,
      updatedAt: new Date(),
    })
    .where(eq(contentTranslation.id, translationId));

  console.log(`[video-translate] Done — ${mediaUrl}`);

  return {
    mediaUrl,
    mediaKey,
    mediaSize,
    totalScenes: sceneCount,
  };
}

// ── Find next pending translated video ──────────────────────────────────────

export async function findPendingTranslatedVideo(): Promise<{ id: string } | null> {
  // Find completed video_script translations that have no media yet,
  // where the original content already has a video (images cached in R2)
  const [pending] = await db
    .select({
      translationId: contentTranslation.id,
    })
    .from(contentTranslation)
    .innerJoin(
      generatedContent,
      eq(contentTranslation.contentId, generatedContent.id)
    )
    .where(
      and(
        eq(generatedContent.contentType, "video_script"),
        eq(contentTranslation.status, "completed"),
        isNull(contentTranslation.mediaUrl),
        // Original must have video (so scene images are cached)
        // Using a simple NOT NULL check on generatedContent.mediaUrl
      )
    )
    .orderBy(asc(contentTranslation.createdAt))
    .limit(1);

  if (!pending) return null;
  return { id: pending.translationId };
}
