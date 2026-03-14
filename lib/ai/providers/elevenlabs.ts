/**
 * ElevenLabs Text-to-Speech + Text-to-Dialogue provider.
 *
 * Unlike the other AI providers (text-in -> text-out), this is an audio provider
 * (text-in -> audio-out). It does NOT implement the shared AICompletionRequest interface.
 *
 * TTS endpoint: POST /v1/text-to-speech/:voiceId
 * Dialogue endpoint: POST /v1/text-to-dialogue
 *
 * Models:
 *   eleven_v3              — best quality, 70+ languages (incl. Persian), 5K char limit
 *   eleven_multilingual_v2 — stable quality, 29 languages (no Persian), 10K char limit
 *   eleven_flash_v2_5      — fast/cheap, 32 languages (no Persian), 40K char limit
 *
 * Persian (fa) is ONLY supported by eleven_v3.
 * English (en) and Turkish (tr) work on all multilingual models.
 */

import type { PodcastScriptContent } from "../types";

const BASE_URL = "https://api.elevenlabs.io/v1";

// ── Default voice map ───────────────────────────────────────────────────────

const DEFAULT_VOICE_MAP: Record<string, string> = {
  Host: "5l5f8iK3YPeGga21rQIX",
  Expert: "UgBBYS2sOqTuMpoF3BR0",
};

// ── Character limit for dialogue API ────────────────────────────────────────

/** Hard limit per API call (eleven_v3) */
const DIALOGUE_CHAR_LIMIT = 5_000;
/** Soft target per chunk — leaves buffer under the hard limit */
const CHUNK_CHAR_TARGET = 4_500;

// ── TTS Types ───────────────────────────────────────────────────────────────

export interface TTSRequest {
  /** Text to convert to speech */
  text: string;
  /** ElevenLabs voice ID (use GET /v1/voices to list available voices) */
  voiceId: string;
  /** Model ID — defaults based on language (eleven_v3 for Persian, eleven_multilingual_v2 otherwise) */
  modelId?: "eleven_v3" | "eleven_multilingual_v2" | "eleven_flash_v2_5";
  /** ISO 639-1 language code (en, tr, fa) — enforces pronunciation language */
  languageCode?: string;
  /** Audio output format — default: mp3_44100_128 */
  outputFormat?: string;
  /** Override voice settings for this request */
  voiceSettings?: {
    /** 0-1. Lower = broader emotional range, higher = more monotonous */
    stability?: number;
    /** 0-1. How closely AI adheres to the original voice */
    similarityBoost?: number;
    /** Style exaggeration (increases latency if non-zero) */
    style?: number;
    /** Speech speed. 1.0 = default */
    speed?: number;
  };
  /** Previous request IDs for stitching long-form audio (up to 3) */
  previousRequestIds?: string[];
}

export interface TTSResponse {
  /** Raw audio bytes */
  audio: Buffer;
  /** Model used for generation */
  modelId: string;
  /** Character count of input text (billing unit) */
  characterCount: number;
}

// ── Dialogue Types ──────────────────────────────────────────────────────────

export interface DialogueInput {
  text: string;
  voiceId: string;
}

export interface DialogueOptions {
  inputs: DialogueInput[];
  /** ISO 639-1 language code — defaults to "en" */
  languageCode?: string;
  /** 0-1, controls voice consistency — defaults to 0.5 (Natural) */
  stability?: number;
  /** Audio output format — defaults to "mp3_44100_128" */
  outputFormat?: string;
}

export interface DialogueResult {
  audio: Buffer;
  characterCount: number;
}

// ── Podcast Types ───────────────────────────────────────────────────────────

export interface PodcastAudioOptions {
  language?: string;
  /** Speaker name -> voice ID override. Falls back to DEFAULT_VOICE_MAP. */
  voiceMap?: Record<string, string>;
}

export interface PodcastAudioResult {
  audio: Buffer;
  totalCharacters: number;
  chunks: number;
  /** Rough estimate based on character count (~15 chars/sec for spoken English) */
  durationEstimate: string;
}

// ── Lazy-init API key ───────────────────────────────────────────────────────

let cachedApiKey: string | null = null;

function getApiKey(): string {
  if (!cachedApiKey) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
    cachedApiKey = apiKey;
  }
  return cachedApiKey;
}

// ── TTS (single voice, existing API) ────────────────────────────────────────

export async function synthesize(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getApiKey();

  // Persian requires eleven_v3 — the ONLY model supporting Farsi
  const modelId =
    request.modelId ??
    (request.languageCode === "fa"
      ? "eleven_v3"
      : "eleven_multilingual_v2");

  const outputFormat = request.outputFormat ?? "mp3_44100_128";

  const t0 = Date.now();
  console.log(
    `[elevenlabs] TTS request — voice=${request.voiceId}, model=${modelId}, ` +
    `lang=${request.languageCode ?? "auto"}, ~${request.text.length} chars`
  );

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${request.voiceId}?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        model_id: modelId,
        ...(request.languageCode && { language_code: request.languageCode }),
        ...(request.voiceSettings && {
          voice_settings: {
            stability: request.voiceSettings.stability ?? 0.5,
            similarity_boost: request.voiceSettings.similarityBoost ?? 0.75,
            ...(request.voiceSettings.style !== undefined && {
              style: request.voiceSettings.style,
            }),
            ...(request.voiceSettings.speed !== undefined && {
              speed: request.voiceSettings.speed,
            }),
          },
        }),
        ...(request.previousRequestIds?.length && {
          previous_request_ids: request.previousRequestIds,
        }),
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[elevenlabs] TTS done in ${elapsed}s — ${request.text.length} chars, ${audioBuffer.byteLength} bytes`
  );

  return {
    audio: audioBuffer,
    modelId,
    characterCount: request.text.length,
  };
}

// ── Dialogue (multi-voice, Text to Dialogue API) ───────────────────────────

export async function generateDialogueAudio(
  options: DialogueOptions,
): Promise<DialogueResult> {
  const apiKey = getApiKey();

  const languageCode = options.languageCode ?? "en";
  const stability = options.stability ?? 0.5;
  const outputFormat = options.outputFormat ?? "mp3_44100_128";
  const characterCount = options.inputs.reduce((sum, i) => sum + i.text.length, 0);

  const t0 = Date.now();

  const response = await fetch(
    `${BASE_URL}/text-to-dialogue?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        inputs: options.inputs.map((i) => ({
          text: i.text,
          voice_id: i.voiceId,
        })),
        model_id: "eleven_v3",
        language_code: languageCode,
        settings: { stability },
        output_format: outputFormat,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs Text-to-Dialogue failed (${response.status}): ${errorText}`,
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[elevenlabs] Dialogue chunk done — ${characterCount} chars, ${elapsed}s, ${audioBuffer.byteLength} bytes`,
  );

  return {
    audio: audioBuffer,
    characterCount,
  };
}

// ── Podcast (full pipeline: segments -> chunked dialogue -> concatenated audio) ─

/**
 * Takes PodcastScriptContent segments, maps speakers to voices, handles the
 * 5,000 char API limit by chunking, and returns concatenated audio.
 */
export async function generatePodcastAudio(
  segments: PodcastScriptContent["segments"],
  options?: PodcastAudioOptions,
): Promise<PodcastAudioResult> {
  const language = options?.language ?? "en";
  const voiceMap = { ...DEFAULT_VOICE_MAP, ...options?.voiceMap };

  // Map segments to dialogue inputs with voice IDs
  const allInputs: DialogueInput[] = segments.map((seg) => {
    const voiceId = voiceMap[seg.speaker];
    if (!voiceId) {
      throw new Error(
        `[elevenlabs] No voice ID for speaker "${seg.speaker}". ` +
        `Available speakers: ${Object.keys(voiceMap).join(", ")}. ` +
        `Pass a voiceMap override to add this speaker.`,
      );
    }
    return { text: seg.text, voiceId };
  });

  // Chunk segments so each chunk stays under the character limit
  const chunks: DialogueInput[][] = [];
  let currentChunk: DialogueInput[] = [];
  let currentChunkChars = 0;

  for (const input of allInputs) {
    // If a single segment exceeds the limit, it still gets its own chunk
    // (the API will reject it, but we let that error propagate naturally)
    if (currentChunk.length > 0 && currentChunkChars + input.text.length > CHUNK_CHAR_TARGET) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkChars = 0;
    }
    currentChunk.push(input);
    currentChunkChars += input.text.length;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const totalCharacters = allInputs.reduce((sum, i) => sum + i.text.length, 0);

  console.log(
    `[elevenlabs] Starting dialogue generation — chunks=${chunks.length}, ` +
    `~${totalCharacters} chars, lang=${language}`,
  );

  const t0 = Date.now();
  const audioBuffers: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkT0 = Date.now();
    const chunkChars = chunks[i].reduce((sum, inp) => sum + inp.text.length, 0);

    const result = await generateDialogueAudio({
      inputs: chunks[i],
      languageCode: language,
    });

    audioBuffers.push(result.audio);

    const chunkElapsed = ((Date.now() - chunkT0) / 1000).toFixed(1);
    console.log(
      `[elevenlabs] Chunk ${i + 1}/${chunks.length} done — ${chunkChars} chars, ${chunkElapsed}s`,
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
    `[elevenlabs] Done in ${totalElapsed}s — total_chars=${totalCharacters}, ` +
    `chunks=${chunks.length}, audio_bytes=${combinedAudio.byteLength}, est=${durationEstimate}`,
  );

  return {
    audio: combinedAudio,
    totalCharacters,
    chunks: chunks.length,
    durationEstimate,
  };
}
