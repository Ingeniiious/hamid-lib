// ---------------------------------------------------------------------------
// Kimi K2.5 Multimodal — Vision API Calls
// OCR, image classification, content description
//
// CRITICAL: Kimi K2.5 has FIXED parameters per official docs:
//   - temperature, top_p, n, presence_penalty, frequency_penalty CANNOT be modified
//   - thinking: {"type":"disabled"} for non-thinking mode
//   - max_tokens is DEPRECATED — use max_completion_tokens
//   - Context window: 262,144 tokens
// CRITICAL: content must be a proper JSON array, NOT a stringified string
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type {
  ExtractedImage,
  ClassifiedImage,
  ImageClassification,
} from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) throw new Error("KIMI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
      timeout: 50_000,
      maxRetries: 0, // Disable SDK auto-retry — extraction orchestrator handles retries
    });
  }
  return client;
}

interface KimiMultimodalResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
}

/**
 * Send a multimodal request to Kimi K2.5.
 * Handles the proper content array format required by the API.
 */
async function kimiMultimodal(
  systemPrompt: string,
  contentParts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
    | { type: "video_url"; video_url: { url: string } }
  >,
  jsonMode: boolean = false,
): Promise<KimiMultimodalResponse> {
  const ai = getClient();

  const body = {
    model: "kimi-k2.5",
    messages: [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        // CRITICAL: content is a proper array, NOT a stringified string
        content: contentParts,
      },
    ],
    max_completion_tokens: 16384,
    thinking: { type: "disabled" },
    ...(jsonMode && { response_format: { type: "json_object" as const } }),
  };

  const response = await ai.chat.completions.create(
    body as unknown as ChatCompletionCreateParamsNonStreaming,
  );

  const choice = response.choices[0];

  // Check for truncation — finish_reason "length" means max_completion_tokens was hit
  if (choice?.finish_reason === "length") {
    throw new Error(
      `Kimi multimodal output truncated (finish_reason=length). ` +
      `Output hit max_completion_tokens limit (16384). ` +
      `Input tokens: ${response.usage?.prompt_tokens ?? 0}`
    );
  }

  return {
    content: choice?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}

// ---------------------------------------------------------------------------
// Image Classification
// ---------------------------------------------------------------------------

// IMPORTANT: Kimi K2.5 JSON mode only generates JSON Objects, NOT JSON Arrays.
// Always wrap arrays inside a root object like { "results": [...] }.
const CLASSIFICATION_PROMPT = `You are an image classifier for an educational content extraction system.
Classify each image into exactly one category:

- "content_diagram": Charts, graphs, diagrams, flowcharts, illustrations with educational value
- "equation": Mathematical equations, formulas, expressions
- "photo_notes": Photos of handwritten notes, whiteboard content, or handwritten text
- "table_image": A table captured as an image
- "decorative": Logos, headers, decorative elements, icons, backgrounds — no educational value

Always respond with a JSON object in this exact format:
{
  "results": [
    {
      "image": 1,
      "classification": "content_diagram",
      "description": "A flowchart showing...",
      "latex": null
    }
  ]
}

Each entry in "results" must have: "image" (number), "classification", "description" (null for decorative), "latex" (null unless equation).
For a single image, still use the "results" array with one entry.`;

/**
 * Classify a batch of images using Kimi K2.5 multimodal.
 * Batches images together for efficiency (Kimi supports unlimited images per request).
 * Max ~10 images per batch to keep response manageable.
 */
export async function classifyImages(
  images: ExtractedImage[],
  batchSize: number = 10,
): Promise<{ classified: ClassifiedImage[]; tokens: number; cost: number }> {
  const allClassified: ClassifiedImage[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Process in batches
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);

    // Build content parts: images + text instruction
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    for (let j = 0; j < batch.length; j++) {
      const img = batch[j];
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        },
      });
      contentParts.push({
        type: "text",
        text: `Image ${j + 1} (from page/slide ${img.pageOrSlide}):`,
      });
    }

    contentParts.push({
      type: "text",
      text: `Classify ${batch.length === 1 ? "this image" : `these ${batch.length} images`}. Respond with a JSON object containing a "results" array.`,
    });

    try {
      const response = await kimiMultimodal(
        CLASSIFICATION_PROMPT,
        contentParts,
        true, // JSON mode
      );

      totalInputTokens += response.inputTokens;
      totalOutputTokens += response.outputTokens;

      // Parse the classification response — Kimi K2.5 JSON mode always returns an object
      const parsed = JSON.parse(response.content);
      const results: Record<string, unknown>[] = Array.isArray(parsed?.results)
        ? parsed.results
        : Array.isArray(parsed) ? parsed : [parsed];

      for (let j = 0; j < batch.length && j < results.length; j++) {
        const result = results[j];
        allClassified.push({
          ...batch[j],
          classification: (result.classification ??
            "decorative") as ImageClassification,
          description: result.description as string | undefined,
          latex: result.latex as string | undefined,
        });
      }
    } catch (e) {
      // If classification fails, mark all images in batch as decorative
      for (const img of batch) {
        allClassified.push({
          ...img,
          classification: "decorative",
          description: `Classification failed: ${(e as Error).message}`,
        });
      }
    }
  }

  // Cost: $0.60/M input, $3.00/M output
  const cost =
    (totalInputTokens * 0.6 + totalOutputTokens * 3.0) / 1_000_000;

  return {
    classified: allClassified,
    tokens: totalInputTokens + totalOutputTokens,
    cost,
  };
}

// ---------------------------------------------------------------------------
// OCR — Handwritten notes, scanned documents
// ---------------------------------------------------------------------------

const OCR_PROMPT = `You are an OCR system for educational documents. Extract ALL text from this image accurately.

Rules:
- Preserve the document structure (headings, paragraphs, lists, tables)
- For handwritten text, do your best to read it accurately
- For mathematical equations, convert to LaTeX notation
- For tables, preserve the table structure using markdown table format
- If text is unclear, indicate with [unclear]
- Output clean, well-formatted text in the document's original language
- Do NOT add any commentary or explanation — only output the extracted text`;

/**
 * OCR a single image using Kimi K2.5 multimodal.
 * For scanned PDFs, photos of notes, whiteboard captures.
 */
export async function ocrImage(
  image: ExtractedImage,
): Promise<{ text: string; tokens: number; cost: number }> {
  const response = await kimiMultimodal(
    OCR_PROMPT,
    [
      {
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType};base64,${image.base64}`,
        },
      },
      {
        type: "text",
        text: "Extract all text from this image.",
      },
    ],
    false, // plain text output, not JSON
  );

  const cost =
    (response.inputTokens * 0.6 + response.outputTokens * 3.0) / 1_000_000;

  return {
    text: response.content,
    tokens: response.inputTokens + response.outputTokens,
    cost,
  };
}

// ---------------------------------------------------------------------------
// Video Understanding
// ---------------------------------------------------------------------------

const VIDEO_PROMPT = `You are analyzing an educational video for content extraction.
Extract ALL educational content from this video:
- Key concepts explained
- Text shown on screen (slides, whiteboard, etc.)
- Mathematical equations or formulas shown
- Diagrams or charts described
- Important spoken content (if inferable from visual context)

Output in structured markdown with clear sections. Include timestamps if visible.
Focus on extracting factual educational content, not describing the video aesthetics.`;

/**
 * Process a video through Kimi K2.5 multimodal for content extraction.
 * videoUrl is either a data: base64 URL or ms:// file ID reference.
 */
export async function extractFromVideo(
  videoUrl: string,
): Promise<{ text: string; tokens: number; cost: number }> {
  const response = await kimiMultimodal(
    VIDEO_PROMPT,
    [
      {
        type: "video_url" as any,
        video_url: {
          url: videoUrl,
        },
      },
      {
        type: "text",
        text: "Extract all educational content from this video.",
      },
    ] as any,
    false,
  );

  const cost =
    (response.inputTokens * 0.6 + response.outputTokens * 3.0) / 1_000_000;

  return {
    text: response.content,
    tokens: response.inputTokens + response.outputTokens,
    cost,
  };
}
