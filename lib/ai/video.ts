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

// ── R2 key patterns ─────────────────────────────────────────────────────────

function sceneImageKey(contentId: string, sceneIndex: number): string {
  return `video/scenes/${contentId}/scene_${sceneIndex}.png`;
}

function sceneAudioKey(contentId: string, sceneIndex: number): string {
  return `video/scenes/${contentId}/scene_${sceneIndex}.mp3`;
}

// ── Original video generation (resumable) ───────────────────────────────────
//
// Each scene's image + audio is uploaded to R2 immediately after generation.
// On retry (e.g. after timeout), already-cached assets are downloaded from R2
// instead of being regenerated. This means progress is never lost.
//
// Flow per scene:
//   1. Check R2 for cached image + audio
//   2. If both exist → skip (use cached)
//   3. If missing → generate + upload to R2 immediately
//   4. Once ALL scenes have assets → stitch + upload final MP4

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

  const total = script.scenes.length;

  // 3. Check R2 for already-cached scene assets (from previous partial runs)
  console.log(`[video] Checking R2 for cached assets (${total} scenes)...`);
  const cachedChecks = await Promise.all(
    script.scenes.map((_, i) =>
      Promise.all([
        downloadFromR2(sceneImageKey(contentId, i)),
        downloadFromR2(sceneAudioKey(contentId, i)),
      ])
    )
  );

  const cachedCount = cachedChecks.filter(
    ([img, aud]) => img.success && aud.success
  ).length;

  console.log(
    `[video] ${cachedCount}/${total} scenes already cached in R2, ` +
      `${total - cachedCount} to generate, lang=${row.language}`
  );

  // 4. Generate missing assets in parallel, upload each to R2 immediately
  const results = await Promise.allSettled(
    script.scenes.map(async (scene, i) => {
      const [cachedImage, cachedAudio] = cachedChecks[i];

      // Use cached if both exist
      if (cachedImage.success && cachedAudio.success) {
        console.log(`[video] Scene ${i + 1}/${total} — cached, skipping`);
        return {
          image: cachedImage.data,
          audio: cachedAudio.data,
        };
      }

      // Generate image (or use cached)
      let imageBuffer: Buffer;
      if (cachedImage.success) {
        imageBuffer = cachedImage.data;
      } else {
        const imageResult = await generateSceneImage(
          scene.imagePrompt ?? scene.visualDescription
        );
        imageBuffer = imageResult.image;
        // Upload to R2 immediately
        await uploadToR2(
          new Uint8Array(imageBuffer),
          sceneImageKey(contentId, i),
          "image/png"
        );
        console.log(`[video] Scene ${i + 1}/${total} image → R2`);
      }

      // Generate audio (or use cached)
      let audioBuffer: Buffer;
      if (cachedAudio.success) {
        audioBuffer = cachedAudio.data;
      } else {
        const audioResult = await synthesizeGrok({
          text: scene.narration,
          voiceId: "ara",
          language: row.language,
        });
        audioBuffer = audioResult.audio;
        // Upload to R2 immediately
        await uploadToR2(
          new Uint8Array(audioBuffer),
          sceneAudioKey(contentId, i),
          "audio/mpeg"
        );
        console.log(`[video] Scene ${i + 1}/${total} audio → R2`);
      }

      console.log(`[video] Scene ${i + 1}/${total} assets ready`);
      return { image: imageBuffer, audio: audioBuffer };
    })
  );

  // 5. Check results — if any failed, throw (but cached ones are safe in R2)
  const succeeded: StitchInput[] = [];
  const failedIndices: number[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      succeeded.push(r.value);
    } else {
      failedIndices.push(i);
    }
  }

  if (failedIndices.length > 0) {
    const firstError = (results[failedIndices[0]] as PromiseRejectedResult).reason;
    throw new Error(
      `[video] ${failedIndices.length}/${total} scenes failed (${succeeded.length} cached in R2). ` +
        `Failed: [${failedIndices.join(",")}]. ` +
        `First error: ${firstError instanceof Error ? firstError.message : String(firstError)}`
    );
  }

  console.log(`[video] All ${total} scene assets ready, stitching...`);

  // 6. Stitch all scenes into a single MP4
  const mp4Buffer = await stitchScenes(succeeded);

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
    totalScenes: total,
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
