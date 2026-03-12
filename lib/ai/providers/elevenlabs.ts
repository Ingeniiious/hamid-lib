/**
 * ElevenLabs Text-to-Speech provider.
 *
 * Unlike the other AI providers (text-in → text-out), this is an audio provider
 * (text-in → audio-out). It does NOT implement the shared AICompletionRequest interface.
 *
 * Models:
 *   eleven_v3           — best quality, 70+ languages (incl. Persian), 5K char limit
 *   eleven_multilingual_v2 — stable quality, 29 languages (no Persian), 10K char limit
 *   eleven_flash_v2_5   — fast/cheap, 32 languages (no Persian), 40K char limit
 *
 * Persian (fa) is ONLY supported by eleven_v3.
 * English (en) and Turkish (tr) work on all multilingual models.
 */

const BASE_URL = "https://api.elevenlabs.io/v1";

// ── Types ────────────────────────────────────────────────────────────────────

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
    /** 0–1. Lower = broader emotional range, higher = more monotonous */
    stability?: number;
    /** 0–1. How closely AI adheres to the original voice */
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

// ── Provider ─────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  return apiKey;
}

export async function synthesize(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getApiKey();

  // Persian requires eleven_v3 — the ONLY model supporting Farsi
  const modelId =
    request.modelId ??
    (request.languageCode === "fa"
      ? "eleven_v3"
      : "eleven_multilingual_v2");

  const outputFormat = request.outputFormat ?? "mp3_44100_128";

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

  return {
    audio: audioBuffer,
    modelId,
    characterCount: request.text.length,
  };
}
