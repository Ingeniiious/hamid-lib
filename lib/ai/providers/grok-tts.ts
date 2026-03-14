/**
 * Grok Text-to-Speech provider (xAI).
 *
 * Unlike the other AI providers (text-in -> text-out), this is an audio provider
 * (text-in -> audio-out). It does NOT implement the shared AICompletionRequest interface.
 *
 * TTS endpoint: POST https://api.x.ai/v1/tts
 *
 * Voices: eve, ara, rex, sal, leo (case-insensitive)
 * Max text: 15,000 characters per request
 * Languages: BCP-47 codes (en, tr, fa, etc.) or "auto"
 * Pricing: $4.20 / 1M characters
 *
 * Use case: draft/preview podcast audio (cheap, decent quality).
 * For final published podcasts, use ElevenLabs instead.
 */

import type { PodcastScriptContent } from "../types";

const BASE_URL = "https://api.x.ai/v1";

// ── Default voice map ───────────────────────────────────────────────────────

const DEFAULT_VOICE_MAP: Record<string, string> = {
  Host: "rex", // Confident, clear, professional
  Expert: "sal", // Smooth, balanced, versatile
};

// ── Character limit ─────────────────────────────────────────────────────────

/** Hard limit per API call */
const MAX_CHARS_PER_REQUEST = 15_000;

// ── Retry config ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

// ── TTS Types ───────────────────────────────────────────────────────────────

export interface GrokTTSRequest {
  /** Text to convert to speech */
  text: string;
  /** Voice ID: eve, ara, rex, sal, leo (case-insensitive) */
  voiceId: string;
  /** BCP-47 language code — defaults to "en" */
  language?: string;
  /** Audio output format settings */
  outputFormat?: {
    /** Audio codec — defaults to "mp3" */
    codec?: "mp3" | "wav" | "pcm" | "mulaw" | "alaw";
    /** Sample rate in Hz (8000-48000) — defaults to 24000 */
    sampleRate?: number;
    /** Bit rate in bps, MP3 only (32000-192000) — defaults to 128000 */
    bitRate?: number;
  };
}

export interface GrokTTSResult {
  /** Raw audio bytes */
  audio: Buffer;
  /** Character count of input text (billing unit) */
  characterCount: number;
}

// ── Podcast Types ───────────────────────────────────────────────────────────

export interface PodcastSegment {
  text: string;
  speaker: string;
  timestamp: string;
}

export interface GrokPodcastOptions {
  /** BCP-47 language code — defaults to "en" */
  language?: string;
  /** Speaker name -> voice_id override. Falls back to DEFAULT_VOICE_MAP. */
  voiceMap?: Record<string, string>;
}

export interface GrokPodcastResult {
  audio: Buffer;
  totalCharacters: number;
  segments: number;
  /** Rough estimate based on character count (~15 chars/sec for spoken English) */
  durationEstimate: string;
}

// ── Lazy-init API key ───────────────────────────────────────────────────────

let cachedApiKey: string | null = null;

function getApiKey(): string {
  if (!cachedApiKey) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY is not set");
    cachedApiKey = apiKey;
  }
  return cachedApiKey;
}

// ── Retry helper ────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  context: string,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(
        `[grok-tts] Retry ${attempt}/${MAX_RETRIES} for ${context} after ${delay}ms`,
      );
      await sleep(delay);
    }

    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      // If retryable status code, continue retrying
      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
        const errorText = await response.text();
        console.log(
          `[grok-tts] ${context} got ${response.status} — ${errorText}`,
        );
        lastError = new Error(
          `Grok TTS failed (${response.status}): ${errorText}`,
        );
        continue;
      }

      // Non-retryable error or exhausted retries — throw immediately
      const errorText = await response.text();
      throw new Error(
        `Grok TTS failed (${response.status}): ${errorText}`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Grok TTS failed")) {
        throw error;
      }
      // Network error — retry if we haven't exhausted retries
      if (attempt < MAX_RETRIES) {
        lastError = error as Error;
        console.log(
          `[grok-tts] ${context} network error — ${(error as Error).message}`,
        );
        continue;
      }
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error("Grok TTS: max retries exhausted");
}

// ── TTS (single segment) ───────────────────────────────────────────────────

/**
 * Synthesize speech for a single text segment using Grok TTS.
 */
export async function synthesizeGrok(
  request: GrokTTSRequest,
): Promise<GrokTTSResult> {
  const apiKey = getApiKey();

  if (request.text.length > MAX_CHARS_PER_REQUEST) {
    throw new Error(
      `[grok-tts] Text exceeds ${MAX_CHARS_PER_REQUEST} char limit ` +
      `(got ${request.text.length} chars). Split into smaller segments.`,
    );
  }

  const language = request.language ?? "en";

  const t0 = Date.now();
  console.log(
    `[grok-tts] TTS request — voice=${request.voiceId}, ` +
    `lang=${language}, ~${request.text.length} chars`,
  );

  const body: Record<string, unknown> = {
    text: request.text,
    voice_id: request.voiceId,
    language,
  };

  if (request.outputFormat) {
    const fmt: Record<string, unknown> = {};
    if (request.outputFormat.codec) fmt.codec = request.outputFormat.codec;
    if (request.outputFormat.sampleRate) fmt.sample_rate = request.outputFormat.sampleRate;
    if (request.outputFormat.bitRate) fmt.bit_rate = request.outputFormat.bitRate;
    if (Object.keys(fmt).length > 0) body.output_format = fmt;
  }

  const response = await fetchWithRetry(
    `${BASE_URL}/tts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    `voice=${request.voiceId}`,
  );

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[grok-tts] TTS done in ${elapsed}s — ${request.text.length} chars, ${audioBuffer.byteLength} bytes`,
  );

  return {
    audio: audioBuffer,
    characterCount: request.text.length,
  };
}

// ── Podcast (full pipeline: segments -> sequential TTS -> concatenated audio) ─

/**
 * Takes PodcastScriptContent segments, maps speakers to voices, processes each
 * segment sequentially via Grok TTS, and returns concatenated MP3 audio.
 */
export async function generatePodcastAudioGrok(
  segments: PodcastScriptContent["segments"],
  options?: GrokPodcastOptions,
): Promise<GrokPodcastResult> {
  const language = options?.language ?? "en";
  const voiceMap = { ...DEFAULT_VOICE_MAP, ...options?.voiceMap };

  const totalCharacters = segments.reduce((sum, seg) => sum + seg.text.length, 0);

  console.log(
    `[grok-tts] Starting podcast generation — segments=${segments.length}, ` +
    `~${totalCharacters} chars, lang=${language}`,
  );

  const t0 = Date.now();
  const audioBuffers: Buffer[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    const voiceId = voiceMap[seg.speaker];
    if (!voiceId) {
      throw new Error(
        `[grok-tts] No voice ID for speaker "${seg.speaker}". ` +
        `Available speakers: ${Object.keys(voiceMap).join(", ")}. ` +
        `Pass a voiceMap override to add this speaker.`,
      );
    }

    const segT0 = Date.now();

    const result = await synthesizeGrok({
      text: seg.text,
      voiceId,
      language,
    });

    audioBuffers.push(result.audio);

    const segElapsed = ((Date.now() - segT0) / 1000).toFixed(1);
    console.log(
      `[grok-tts] Segment ${i + 1}/${segments.length} done — ` +
      `speaker=${seg.speaker}, ${seg.text.length} chars, ${segElapsed}s`,
    );
  }

  const combinedAudio = Buffer.concat(audioBuffers);
  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // Rough duration estimate: ~15 chars/sec for spoken English
  const estimatedSeconds = Math.round(totalCharacters / 15);
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const remainderSeconds = estimatedSeconds % 60;
  const durationEstimate =
    estimatedMinutes > 0
      ? `~${estimatedMinutes}m ${remainderSeconds}s`
      : `~${estimatedSeconds}s`;

  console.log(
    `[grok-tts] Done in ${totalElapsed}s — total_chars=${totalCharacters}, ` +
    `segments=${segments.length}, audio_bytes=${combinedAudio.byteLength}, est=${durationEstimate}`,
  );

  return {
    audio: combinedAudio,
    totalCharacters,
    segments: segments.length,
    durationEstimate,
  };
}
