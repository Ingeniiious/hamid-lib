// ---------------------------------------------------------------------------
// PPTX Extraction — Phase 1 deterministic
//
// Strategy: adm-zip + XML parsing (local) first → Kimi Files API fallback.
// If local extraction fails or returns empty, fall back to Kimi which
// handles PPTX natively for free.
// ---------------------------------------------------------------------------

import AdmZip from "adm-zip";
import type { DeterministicResult, ExtractedImage } from "./types";
import { extractViaKimi } from "./kimi-fallback";

/**
 * Extract text, speaker notes, and images from a PPTX buffer.
 *
 * - Slides: reads ppt/slides/slide{N}.xml, extracts all <a:t> text nodes
 *   grouped by <a:p> paragraphs.
 * - Speaker notes: reads ppt/notesSlides/notesSlide{N}.xml.
 * - Images: reads all files under ppt/media/ with known image extensions.
 * - Tables are NOT extracted here — they are handled in Phase 2 by Kimi
 *   multimodal because PowerPoint table XML is deeply nested and
 *   non-trivial to reconstruct reliably.
 */
export async function extractFromPptx(
  buffer: Buffer,
  fileName = "presentation.pptx",
): Promise<DeterministicResult> {
  // Try local extraction first
  const localResult = await tryAdmZip(buffer);

  if (localResult && localResult.textByPage.length > 0) {
    return localResult;
  }

  // Local extraction failed or returned empty — try Kimi Files API
  console.log(
    `[pptx] adm-zip ${localResult ? "returned empty" : "failed"} — falling back to Kimi Files API`,
  );

  const kimiResult = await extractViaKimi(buffer, fileName);

  if (kimiResult && kimiResult.textByPage.length > 0) {
    return {
      ...kimiResult,
      warnings: [
        ...(localResult?.warnings ?? []),
        ...kimiResult.warnings,
      ],
    };
  }

  // Both failed
  console.log("[pptx] Both adm-zip and Kimi Files API failed — extraction empty");
  return {
    textByPage: [],
    images: [],
    tables: [],
    warnings: [
      ...(localResult?.warnings ?? []),
      ...(kimiResult?.warnings ?? []),
      "PPTX extraction failed with both adm-zip and Kimi Files API. No text content could be extracted.",
    ],
    isScanned: false,
  };
}

// ---------------------------------------------------------------------------
// adm-zip — local PPTX extraction (ZIP + XML parsing)
// ---------------------------------------------------------------------------

async function tryAdmZip(buffer: Buffer): Promise<DeterministicResult | null> {
  const warnings: string[] = [];
  const images: ExtractedImage[] = [];
  const textByPage: { page: number; text: string }[] = [];
  const speakerNotes: { slide: number; notes: string }[] = [];

  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // --- Collect slide XML entries, sorted by slide number -------------------
    const slideEntries = entries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
        const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
        return numA - numB;
      });

    // --- Collect speaker notes -----------------------------------------------
    const notesMap = new Map<number, string>();
    for (const entry of entries) {
      const match = entry.entryName.match(
        /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/,
      );
      if (match) {
        const noteXml = entry.getData().toString("utf-8");
        const noteText = extractTextFromXml(noteXml);
        if (noteText.trim()) {
          notesMap.set(parseInt(match[1], 10), noteText.trim());
        }
      }
    }

    // --- Extract text from each slide ----------------------------------------
    for (let i = 0; i < slideEntries.length; i++) {
      const slideNum = i + 1;
      const slideXml = slideEntries[i].getData().toString("utf-8");
      const slideText = extractTextFromXml(slideXml);

      if (slideText.trim()) {
        textByPage.push({ page: slideNum, text: slideText.trim() });
      }

      const notes = notesMap.get(slideNum);
      if (notes) {
        speakerNotes.push({ slide: slideNum, notes });
      }
    }

    // --- Extract embedded images from ppt/media/ -----------------------------
    const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|webp|bmp|tiff|svg)$/i;
    const mediaEntries = entries.filter(
      (e) => /^ppt\/media\//.test(e.entryName) && IMAGE_EXT_RE.test(e.entryName),
    );

    for (const mediaEntry of mediaEntries) {
      try {
        const imageData = mediaEntry.getData();
        const ext = mediaEntry.entryName.split(".").pop()?.toLowerCase() ?? "png";
        const mimeType = getMimeType(ext);

        images.push({
          base64: imageData.toString("base64"),
          mimeType,
          pageOrSlide: 0, // cannot reliably map ppt/media/ files to slides without rels
        });
      } catch {
        warnings.push(`Failed to extract image: ${mediaEntry.entryName}`);
      }
    }

    if (slideEntries.length === 0) {
      warnings.push("No slides found in PPTX file");
    }

    // Detect image-heavy presentations: if many slides have images but little text,
    // mark as scanned so Phase 2 OCRs all non-decorative images
    const totalTextChars = textByPage.reduce((sum, p) => sum + p.text.length, 0);
    const avgCharsPerSlide = slideEntries.length > 0 ? totalTextChars / slideEntries.length : 0;
    const isImageHeavy = images.length > 0 && (
      avgCharsPerSlide < 50 ||                                    // very little text overall
      (images.length >= slideEntries.length * 0.3 && avgCharsPerSlide < 150) // many images + sparse text
    );

    if (isImageHeavy) {
      warnings.push(`Presentation appears image-heavy (${images.length} images, avg ${Math.round(avgCharsPerSlide)} chars/slide) — images will be OCR'd`);
    }

    return {
      textByPage,
      images,
      tables: [], // handled in Phase 2 via Kimi multimodal
      speakerNotes: speakerNotes.length > 0 ? speakerNotes : undefined,
      warnings,
      isScanned: isImageHeavy,
    };
  } catch (e) {
    warnings.push(`PPTX extraction failed: ${(e as Error).message}`);
    return {
      textByPage: [],
      images: [],
      tables: [],
      warnings,
      isScanned: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract all text content from a PowerPoint Open XML string.
 *
 * Text lives in `<a:t>` tags grouped inside `<a:p>` paragraphs.
 * Each `<a:p>` becomes one line; `<a:t>` fragments within a paragraph
 * are concatenated (they represent runs with different formatting).
 */
function extractTextFromXml(xml: string): string {
  const paragraphs: string[] = [];

  const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const paragraphXml = pMatch[1];
    const textParts: string[] = [];

    const tRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(paragraphXml)) !== null) {
      textParts.push(decodeXmlEntities(tMatch[1]));
    }

    if (textParts.length > 0) {
      paragraphs.push(textParts.join(""));
    }
  }

  return paragraphs.join("\n");
}

/** Decode the five standard XML entities back to their characters. */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Map a file extension to its MIME type. */
function getMimeType(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "tiff":
      return "image/tiff";
    default:
      return "image/png";
  }
}
