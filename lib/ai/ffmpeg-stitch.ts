// ---------------------------------------------------------------------------
// FFmpeg Scene Stitching
//
// Takes an array of scene assets (PNG image + MP3 audio per scene),
// stitches into a single MP4 using a single-pass concat filter.
//
// Uses ffmpeg-static binary via child_process (reliable on Vercel serverless).
//
// Single-pass approach avoids AAC encoder delay drift that occurs when
// encoding scenes separately then concat-copying (padding accumulates
// at segment boundaries, causing audio/video desync).
// ---------------------------------------------------------------------------

import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Resolve ffmpeg binary path — ffmpeg-static exports the path
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require("ffmpeg-static");

// ── Types ───────────────────────────────────────────────────────────────────

export interface StitchInput {
  /** PNG image buffer for the scene */
  image: Buffer;
  /** MP3 audio buffer for the scene narration */
  audio: Buffer;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse audio duration from ffmpeg stderr (e.g. "Duration: 00:00:22.31") */
function getAudioDuration(audioPath: string): number {
  try {
    execFileSync(ffmpegPath, ["-i", audioPath], {
      stdio: "pipe",
      timeout: 10_000,
    });
  } catch (e: unknown) {
    // ffmpeg exits with error when called with -i only (no output), but
    // still prints metadata to stderr — that's where we read the duration
    const stderr = (e as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const centiseconds = parseInt(match[4], 10);
      return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
    }
  }
  // Fallback: return a generous default — -shortest will trim anyway
  return 120;
}

// ── Scene stitching ─────────────────────────────────────────────────────────

/**
 * Stitches scene assets (image + audio per scene) into a single MP4 video.
 *
 * Uses a single-pass concat filter to avoid AAC encoder delay drift.
 * Each image is looped for exactly its audio's duration, then everything
 * is encoded in one pass — zero segment boundary issues.
 */
export async function stitchScenes(scenes: StitchInput[]): Promise<Buffer> {
  if (scenes.length === 0) {
    throw new Error("[ffmpeg] No scenes to stitch");
  }

  const t0 = Date.now();
  const workDir = mkdtempSync(join(tmpdir(), "video-stitch-"));

  console.log(
    `[ffmpeg] Stitching ${scenes.length} scenes in ${workDir}`
  );

  try {
    // Step 1: Write scene assets to disk + get audio durations
    const durations: number[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const imgPath = join(workDir, `scene_${i}.png`);
      const audioPath = join(workDir, `scene_${i}.mp3`);
      writeFileSync(imgPath, scenes[i].image);
      writeFileSync(audioPath, scenes[i].audio);

      const dur = getAudioDuration(audioPath);
      durations.push(dur);
      console.log(`[ffmpeg] Scene ${i}: audio duration = ${dur.toFixed(2)}s`);
    }

    // Step 2: Build single-pass ffmpeg command with concat filter
    //
    // Inputs: -loop 1 -t <dur> -i scene_N.png  (image looped for audio duration)
    //         -i scene_N.mp3                     (audio)
    //
    // Filter: scale all to consistent resolution, concat all segments
    //
    // Input index mapping:
    //   scene 0: image = 0, audio = 1
    //   scene 1: image = 2, audio = 3
    //   scene N: image = N*2, audio = N*2+1

    const inputArgs: string[] = [];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const imgIdx = i * 2;
      const audioIdx = i * 2 + 1;

      // Image input: loop for audio duration
      inputArgs.push(
        "-loop", "1",
        "-t", durations[i].toFixed(2),
        "-i", join(workDir, `scene_${i}.png`)
      );
      // Audio input
      inputArgs.push(
        "-i", join(workDir, `scene_${i}.mp3`)
      );

      // Video filter: scale to 1920x1080 (16:9), consistent fps, pixel format
      filterParts.push(
        `[${imgIdx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,` +
        `fps=25,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`
      );
      // Audio filter: normalize format
      filterParts.push(
        `[${audioIdx}:a]aformat=sample_rates=44100:channel_layouts=mono,` +
        `asetpts=PTS-STARTPTS[a${i}]`
      );

      concatInputs.push(`[v${i}][a${i}]`);
    }

    // Concat filter: merge all video+audio segments
    const concatFilter =
      `${concatInputs.join("")}concat=n=${scenes.length}:v=1:a=1[outv][outa]`;

    const fullFilter = [...filterParts, concatFilter].join("; ");

    const outputPath = join(workDir, "output.mp4");

    const ffmpegArgs = [
      "-y",
      ...inputArgs,
      "-filter_complex", fullFilter,
      "-map", "[outv]",
      "-map", "[outa]",
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath,
    ];

    console.log(`[ffmpeg] Running single-pass encode (${scenes.length} scenes)...`);

    execFileSync(ffmpegPath, ffmpegArgs, {
      stdio: "pipe",
      timeout: 300_000, // 5 min max for full encode
    });

    // Step 3: Read output
    const mp4Buffer = readFileSync(outputPath);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    console.log(
      `[ffmpeg] Stitching complete in ${elapsed}s — ${mp4Buffer.byteLength} bytes, ${scenes.length} scenes`
    );

    return mp4Buffer;
  } finally {
    // Always clean up temp directory
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
