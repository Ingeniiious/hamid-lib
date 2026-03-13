// ---------------------------------------------------------------------------
// Content Translation — on-demand translation of generated content
//
// Strategy:
// - GPT-5.4 via Batch API (50% discount) — best quality, especially for
//   Persian and Turkish. Users can wait; translation runs in background.
// - Kimi K2.5 via standard API — cheap instant fallback when batch is not
//   available or for preview purposes.
//
// Flow:
// 1. Student requests translation → check content_translation cache
// 2. If cached + completed → return immediately
// 3. If not cached → create translation job (pending)
// 4. Background process (cron or batch webhook) handles translation
// 5. Result stored in content_translation table
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { contentTranslation, generatedContent } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import type { ContentType } from "./types";

// ---------------------------------------------------------------------------
// Language labels for prompts
// ---------------------------------------------------------------------------

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fa: "Persian (فارسی)",
  tr: "Turkish (Türkçe)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  ar: "Arabic (العربية)",
  zh: "Chinese (中文)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  ru: "Russian (Русский)",
  pt: "Portuguese (Português)",
  it: "Italian (Italiano)",
  hi: "Hindi (हिन्दी)",
  nl: "Dutch (Nederlands)",
  sv: "Swedish (Svenska)",
  pl: "Polish (Polski)",
  uk: "Ukrainian (Українська)",
};

/** Get human-readable language name */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// ---------------------------------------------------------------------------
// Translation prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the system + user prompts for translating content.
 * The translator must preserve JSON structure while translating all text values.
 */
export function getTranslationPrompt(
  contentType: ContentType,
  sourceLanguage: string,
  targetLanguage: string,
  content: string,
  title: string,
  description?: string | null,
): { system: string; user: string } {
  const sourceLang = getLanguageName(sourceLanguage);
  const targetLang = getLanguageName(targetLanguage);

  const system = `You are an expert academic translator specializing in educational content. You translate university course materials with precision and native fluency.

TASK: Translate a ${contentType.replace(/_/g, " ")} from ${sourceLang} to ${targetLang}.

CRITICAL RULES:
- Translate ALL text content to ${targetLang}. Every string value in the JSON must be translated.
- Preserve the EXACT JSON structure. Do not add, remove, or rename any keys. Only translate string values.
- Use native, natural ${targetLang} — not word-for-word translation. The result should read as if it was originally written in ${targetLang}.
- Preserve technical terminology accurately. For widely-known technical terms (e.g., "GDP", "DNA", "API"), keep the original term in parentheses after the translation if helpful.
- Maintain the academic tone and register appropriate for university students.
- For mathematical formulas, equations, and numbers — keep them as-is. Only translate the surrounding text.
- Preserve any LaTeX, code snippets, or special formatting unchanged.
- If the content has field names like "front"/"back" (flashcards) or "question"/"explanation" (quiz) — translate the VALUES, not the keys.

OUTPUT: Return ONLY valid JSON with the same structure as the input, with all text values translated to ${targetLang}. No markdown, no code fences, no commentary.`;

  let user = `Translate the following content from ${sourceLang} to ${targetLang}.

Title: ${title}`;

  if (description) {
    user += `\nDescription: ${description}`;
  }

  user += `\n\nContent to translate:\n\n${content}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Translation request — creates a pending job in the database
// ---------------------------------------------------------------------------

/**
 * Request a translation for a piece of generated content.
 *
 * If a translation already exists (any status), returns it.
 * Otherwise creates a pending translation job.
 *
 * @returns The translation row (may be pending, processing, completed, or failed)
 */
export async function requestTranslation(
  contentId: string,
  targetLanguage: string,
  mode: "batch" | "instant" = "batch",
): Promise<{
  id: string;
  status: string;
  content: unknown | null;
  richText: string | null;
  title: string;
}> {
  // Check for existing translation
  const existing = await db
    .select()
    .from(contentTranslation)
    .where(
      and(
        eq(contentTranslation.contentId, contentId),
        eq(contentTranslation.targetLanguage, targetLanguage),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      status: existing[0].status,
      content: existing[0].content,
      richText: existing[0].richText,
      title: existing[0].title,
    };
  }

  // Fetch original content to get the title
  const original = await db
    .select()
    .from(generatedContent)
    .where(eq(generatedContent.id, contentId))
    .limit(1);

  if (original.length === 0) {
    throw new Error(`Content not found: ${contentId}`);
  }

  // Create pending translation job
  const translatedBy = mode === "batch" ? "chatgpt" : "kimi";

  const [row] = await db
    .insert(contentTranslation)
    .values({
      contentId,
      targetLanguage,
      title: original[0].title, // will be replaced with translated title
      translatedBy,
      translationMode: mode,
      status: "pending",
    })
    .returning();

  return {
    id: row.id,
    status: row.status,
    content: row.content,
    richText: row.richText,
    title: row.title,
  };
}

// ---------------------------------------------------------------------------
// Translation processing — picks up pending jobs and calls AI
// ---------------------------------------------------------------------------

/** Cost per million tokens for translation models */
const TRANSLATION_COSTS: Record<string, { input: number; output: number }> = {
  chatgpt: { input: 2.5, output: 15 },  // GPT-5.4 real-time (batch would be 50% off)
  kimi: { input: 0.6, output: 3 },       // Kimi K2.5
};

/**
 * Process the next pending translation job.
 * Called by cron. Processes ONE job per invocation.
 *
 * Uses real-time API calls for both modes (batch API infra not built yet).
 * - "batch" mode → GPT-5.4 (best quality, especially Persian/Turkish)
 * - "instant" mode → Kimi K2.5 (cheapest, good enough)
 */
export async function processNextTranslation(): Promise<{
  id: string;
  status: string;
  targetLanguage: string;
} | null> {
  // Find oldest pending translation
  const [job] = await db
    .select()
    .from(contentTranslation)
    .where(eq(contentTranslation.status, "pending"))
    .orderBy(contentTranslation.createdAt)
    .limit(1);

  if (!job) return null;

  // Mark as processing
  await db
    .update(contentTranslation)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(contentTranslation.id, job.id));

  try {
    // Fetch the original content
    const [original] = await db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.id, job.contentId))
      .limit(1);

    if (!original) {
      throw new Error(`Original content not found: ${job.contentId}`);
    }

    const contentStr = original.content
      ? JSON.stringify(original.content)
      : original.richText ?? "";

    if (!contentStr) {
      throw new Error("Original content is empty — nothing to translate");
    }

    // Build prompts
    const sourceLanguage = original.language ?? "en";
    const { system, user } = getTranslationPrompt(
      original.contentType as ContentType,
      sourceLanguage,
      job.targetLanguage,
      contentStr,
      original.title,
      original.description,
    );

    // Call the AI model
    const { complete } = await import("./client");
    const modelSlug = job.translatedBy as "chatgpt" | "kimi";

    const response = await complete({
      model: modelSlug,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      responseFormat: "json",
      temperature: 0.3,
    });

    // Parse the translated content
    let translatedContent: unknown = null;
    let translatedRichText: string | null = null;
    let translatedTitle = job.title;
    let translatedDescription: string | null = job.description;

    try {
      const parsed = JSON.parse(response.content);

      // If original was structured JSON (flashcards, quiz, etc.), the translation is too
      if (original.content) {
        translatedContent = parsed;
      }
      // If original was rich text, translation comes back as JSON with text fields
      if (original.richText) {
        translatedRichText = response.content;
      }

      // Try to extract translated title/description if the model included them
      if (parsed.title && typeof parsed.title === "string") {
        translatedTitle = parsed.title;
      }
      if (parsed.description && typeof parsed.description === "string") {
        translatedDescription = parsed.description;
      }
    } catch {
      // If JSON parse fails, treat the whole output as rich text
      translatedRichText = response.content;
    }

    // Calculate cost
    const costs = TRANSLATION_COSTS[modelSlug] ?? TRANSLATION_COSTS.kimi;
    const costUsd =
      (response.inputTokens * costs.input + response.outputTokens * costs.output) / 1_000_000;

    // Save completed translation
    await db
      .update(contentTranslation)
      .set({
        content: translatedContent as any,
        richText: translatedRichText,
        title: translatedTitle,
        description: translatedDescription,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: costUsd.toFixed(6),
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentTranslation.id, job.id));

    console.log(
      `[translation] Completed ${job.id} → ${job.targetLanguage} via ${modelSlug} — $${costUsd.toFixed(6)}`
    );

    return { id: job.id, status: "completed", targetLanguage: job.targetLanguage };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[translation] Failed ${job.id}:`, errorMsg);

    await db
      .update(contentTranslation)
      .set({
        status: "failed",
        errorMessage: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(contentTranslation.id, job.id));

    return { id: job.id, status: "failed", targetLanguage: job.targetLanguage };
  }
}

// ---------------------------------------------------------------------------
// Language detection (used during extraction)
// ---------------------------------------------------------------------------

/**
 * Detect the primary language of a text using a larger sample and word-level analysis.
 * Uses up to 5000 chars, analyzes word-level patterns instead of just char presence.
 * This prevents false positives when English text mentions Turkish/Persian names or places.
 * Returns ISO 639-1 code.
 */
export function detectLanguageFromText(text: string): string {
  // Use a larger sample for better accuracy
  const sample = text.slice(0, 5000);
  const words = sample.split(/\s+/).filter((w) => w.length > 1);
  const totalWords = words.length || 1;

  // --- Script-based detection (non-Latin scripts are unambiguous) ---

  // Persian/Arabic script — count chars in Arabic block
  const arabicChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  const arabicRatio = arabicChars / (sample.replace(/\s/g, "").length || 1);
  if (arabicRatio > 0.3) {
    // Persian-specific characters: پ چ ژ گ ک ی
    if (/[پچژگکی]/.test(sample)) return "fa";
    return "ar";
  }

  // CJK detection
  const cjkChars = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjkChars / (sample.replace(/\s/g, "").length || 1) > 0.2) return "zh";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return "ja";
  if (/[\uac00-\ud7af]/.test(sample)) return "ko";

  // Cyrillic — ratio-based
  const cyrillicChars = (sample.match(/[\u0400-\u04FF]/g) || []).length;
  if (cyrillicChars / (sample.replace(/\s/g, "").length || 1) > 0.3) {
    if (/[\u0404\u0406\u0407\u0490\u0491]/.test(sample)) return "uk";
    return "ru";
  }

  // --- Latin-script detection (Turkish vs English vs others) ---
  // Count words containing Turkish-specific characters (not just individual chars).
  // A Turkish proper noun in English text ("İstinye Üniversitesi") shouldn't flip the language.
  const turkishWordCount = words.filter((w) => /[İıŞşĞğ]/.test(w)).length;
  const turkishWordRatio = turkishWordCount / totalWords;

  // Also check for common Turkish function words (strong signal)
  const turkishFunctionWords = /\b(ve|ile|bir|bu|da|de|için|olan|gibi|ama|ancak|çok|değil|ise|ki|veya|hem|nasıl|neden)\b/gi;
  const turkishFuncMatches = (sample.match(turkishFunctionWords) || []).length;
  const turkishFuncRatio = turkishFuncMatches / totalWords;

  // Turkish if >15% of words have Turkish chars OR >5% are Turkish function words
  if (turkishWordRatio > 0.15 || turkishFuncRatio > 0.05) return "tr";

  // German-specific: ß + high ä ö ü density
  if (/ß/.test(sample)) return "de";
  const germanChars = (sample.match(/[ÄäÖöÜü]/g) || []).length;
  if (germanChars > 10 && turkishWordCount <= 1) return "de";

  // Spanish
  if (/[ñ¿¡]/i.test(sample)) return "es";
  const spanishAccents = (sample.match(/[áéíóú]/gi) || []).length;
  if (spanishAccents > 10) return "es";

  // French
  const frenchChars = (sample.match(/[àâçèêëîïôùûüÿœæ]/gi) || []).length;
  if (frenchChars > 10) return "fr";

  // Portuguese
  if (/[ãõ]/i.test(sample)) return "pt";

  // Default to English
  return "en";
}
