// ---------------------------------------------------------------------------
// Video Processing for Kimi K2.5 Multimodal
// Videos are either sent as base64 (< 20MB) or uploaded via Kimi Files API
// Per Kimi docs: max 2K (2048x1080) resolution, max 100MB per file
// Supported: mp4, mpeg, mov, avi, webm, wmv, 3gpp
// ---------------------------------------------------------------------------

import OpenAI from "openai";

/** Max size for base64 video in request body */
const MAX_BASE64_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) throw new Error("KIMI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
      timeout: 120_000, // Video upload can take longer
    });
  }
  return client;
}

export interface VideoReference {
  /** How to reference this video in Kimi API — either base64 data URL or ms:// file ID */
  url: string;
  /** Whether this was uploaded (file ID) or sent inline (base64) */
  method: "base64" | "file_upload";
  /** File ID if uploaded (for cleanup later) */
  fileId?: string;
}

/**
 * Prepare a video for Kimi K2.5 multimodal processing.
 * Small videos (< 20MB) -> base64 inline
 * Large videos -> upload to Kimi Files API, get ms:// reference
 */
export async function prepareVideoForKimi(
  buffer: Buffer,
  mimeType: string,
): Promise<VideoReference> {
  // Determine video extension from MIME type
  const ext = mimeTypeToExt(mimeType);

  if (buffer.length <= MAX_BASE64_VIDEO_BYTES) {
    // Small enough for base64 inline
    const base64 = buffer.toString("base64");
    return {
      url: `data:${mimeType};base64,${base64}`,
      method: "base64",
    };
  }

  // Upload via Kimi Files API
  const ai = getClient();
  const file = await ai.files.create({
    file: new File([new Uint8Array(buffer)], `video.${ext}`, { type: mimeType }),
    purpose: "video" as any, // Kimi-specific purpose, not in OpenAI types
  });

  return {
    url: `ms://${file.id}`,
    method: "file_upload",
    fileId: file.id,
  };
}

/**
 * Clean up uploaded video files from Kimi storage.
 */
export async function cleanupVideoFile(fileId: string): Promise<void> {
  try {
    const ai = getClient();
    await ai.files.delete(fileId);
  } catch {
    // Best-effort cleanup
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-ms-wmv": "wmv",
    "video/3gpp": "3gpp",
    "video/x-flv": "flv",
  };
  return map[mimeType] ?? "mp4";
}
