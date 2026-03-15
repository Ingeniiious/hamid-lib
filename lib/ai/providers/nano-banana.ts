// ---------------------------------------------------------------------------
// Nano Banana 2 — Image Generation Provider (Google Gemini)
//
// Generates scene images for video_script content using Gemini 3.1 Flash
// image preview model. Accepts an imagePrompt + branded background template,
// returns a PNG buffer.
//
// Model: gemini-3.1-flash-image-preview
// Pricing: ~$0.045/image (2K), $0.067 (1K), $0.101 (2K)
// ---------------------------------------------------------------------------

import { GoogleGenAI } from "@google/genai";
import { VIDEO_BACKGROUND_URL } from "../types";

// ── Lazy-init Google AI client ──────────────────────────────────────────────

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// ── Cached background image ─────────────────────────────────────────────────

let cachedBackground: { base64: string; mimeType: string } | null = null;

async function getBackground(): Promise<{ base64: string; mimeType: string }> {
  if (cachedBackground) return cachedBackground;

  console.log(`[nano-banana] Fetching background from ${VIDEO_BACKGROUND_URL}`);
  const response = await fetch(VIDEO_BACKGROUND_URL);

  if (!response.ok) {
    throw new Error(
      `[nano-banana] Failed to fetch background: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type") ?? "image/png";

  cachedBackground = { base64, mimeType };
  console.log(
    `[nano-banana] Background cached — ${arrayBuffer.byteLength} bytes`
  );

  return cachedBackground;
}

// ── Retry config ────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 3_000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Style prefix (enforces consistent visual design across all scenes) ──────

const STYLE_PREFIX = `You are generating educational illustrations for a university-level course video by Hamid Library (libraryyy.com). STRICT STYLE RULES:
- Use a modern flat illustration style with soft gradients and clean vector shapes
- Color palette: deep navy (#1a1a3e), brand purple (#5227FF), soft blue (#6b7db3), light lavender (#e8e0ff), white accents
- All human figures must be stylized/abstract (no photorealistic faces), diverse, using the same proportions and line weight
- Scene content is placed on the provided branded background template (keep the libraryyy.com watermark visible)
- Include a scene title banner at the top center in a rounded pill shape with white text on dark navy
- 16:9 aspect ratio, 2K resolution
- NO photographic elements, NO 3D renders — only flat vector illustration

Scene to illustrate: `;

// ── Image generation ────────────────────────────────────────────────────────

export async function generateSceneImage(imagePrompt: string): Promise<{
  image: Buffer;
  mimeType: string;
}> {
  if (!imagePrompt) {
    throw new Error("[nano-banana] imagePrompt is empty or undefined");
  }

  const ai = getGemini();
  const background = await getBackground();

  const fullPrompt = STYLE_PREFIX + imagePrompt;

  const t0 = Date.now();
  console.log(
    `[nano-banana] Generating image — prompt: "${imagePrompt.slice(0, 80)}..."`
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(
        `[nano-banana] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`
      );
      await sleep(delay);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: fullPrompt },
              {
                inlineData: {
                  mimeType: background.mimeType,
                  data: background.base64,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
        },
      });

      // Extract image from response
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("[nano-banana] No candidates in response");
      }

      const parts = candidates[0].content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error("[nano-banana] No parts in response candidate");
      }

      const imagePart = parts.find(
        (p) => "inlineData" in p && p.inlineData
      );
      if (!imagePart?.inlineData?.data) {
        throw new Error("[nano-banana] No inlineData image in response parts");
      }

      const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[nano-banana] Image generated in ${elapsed}s — ${imageBuffer.byteLength} bytes`
      );

      return {
        image: imageBuffer,
        mimeType: imagePart.inlineData.mimeType ?? "image/png",
      };
    } catch (error) {
      lastError = error as Error;

      // Check if retryable (rate limit or server error)
      const message = lastError.message ?? "";
      const isRetryable =
        Array.from(RETRYABLE_STATUS_CODES).some((code) =>
          message.includes(String(code))
        ) || message.includes("RESOURCE_EXHAUSTED");

      if (isRetryable && attempt < MAX_RETRIES) {
        console.log(
          `[nano-banana] Retryable error: ${message.slice(0, 120)}`
        );
        continue;
      }

      // Non-retryable or exhausted retries
      throw lastError;
    }
  }

  throw lastError ?? new Error("[nano-banana] Max retries exhausted");
}
