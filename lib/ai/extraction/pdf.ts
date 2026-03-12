// ---------------------------------------------------------------------------
// PDF Extraction — Phase 1 deterministic
//
// Strategy: unpdf (serverless-compatible) first → Kimi Files API fallback.
// unpdf ships an inlined PDF.js worker that works on Vercel/Turbopack without
// config. If it fails (corrupted PDF, encrypted, etc.) we fall back to Kimi
// Files API which parses server-side for free.
// ---------------------------------------------------------------------------

import type { DeterministicResult } from "./types";

/**
 * Minimum average text characters per page to consider the PDF as having a
 * real text layer (i.e. not a scanned document).
 */
const MIN_TEXT_PER_PAGE = 20;

const KIMI_BASE_URL = "https://api.moonshot.ai/v1";

/**
 * Extract text from a PDF buffer.
 *
 * 1. Try unpdf (free, local, serverless-compatible)
 * 2. If unpdf fails or returns empty → fall back to Kimi Files API (free, server-side)
 * 3. If both fail → return failure result so orchestrator can handle it
 */
export async function extractFromPdf(
  buffer: Buffer,
): Promise<DeterministicResult> {
  // Try unpdf first
  const unpdfResult = await tryUnpdf(buffer);

  if (unpdfResult && unpdfResult.textByPage.length > 0) {
    return unpdfResult;
  }

  // unpdf failed or returned empty — try Kimi Files API
  console.log(
    `[pdf] unpdf ${unpdfResult ? "returned empty" : "failed"} — falling back to Kimi Files API`
  );

  const kimiResult = await tryKimiFilesApi(buffer);

  if (kimiResult && kimiResult.textByPage.length > 0) {
    return kimiResult;
  }

  // Both failed — return empty with clear error
  console.log("[pdf] Both unpdf and Kimi Files API failed — extraction empty");
  return {
    textByPage: [],
    images: [],
    tables: [],
    warnings: [
      ...(unpdfResult?.warnings ?? []),
      ...(kimiResult?.warnings ?? []),
      "PDF extraction failed with both unpdf and Kimi Files API. No text content could be extracted.",
    ],
    isScanned: true,
  };
}

// ---------------------------------------------------------------------------
// unpdf — serverless-compatible PDF text extraction
// ---------------------------------------------------------------------------

async function tryUnpdf(buffer: Buffer): Promise<DeterministicResult | null> {
  const warnings: string[] = [];
  const textByPage: { page: number; text: string }[] = [];

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");

    // Get per-page text
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    const numPages = doc.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str)
        .join(" ")
        .trim();

      if (pageText) {
        textByPage.push({ page: i, text: pageText });
      }
    }

    // Clean up
    await doc.cleanup();

    // Scanned-PDF detection
    const totalTextLength = textByPage
      .reduce((sum, p) => sum + p.text.replace(/\s/g, "").length, 0);
    const avgTextPerPage = totalTextLength / Math.max(numPages, 1);
    const isScanned = avgTextPerPage < MIN_TEXT_PER_PAGE;

    if (isScanned && textByPage.length === 0) {
      warnings.push(
        `PDF appears to be scanned/image-only (avg ${Math.round(avgTextPerPage)} chars/page). ` +
        `Will use Kimi K2.5 multimodal OCR.`
      );
    }

    return {
      textByPage,
      images: [],
      tables: [],
      warnings,
      isScanned,
    };
  } catch (e) {
    warnings.push(`unpdf extraction failed: ${(e as Error).message}`);
    return {
      textByPage: [],
      images: [],
      tables: [],
      warnings,
      isScanned: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Kimi Files API — server-side PDF extraction (free)
// ---------------------------------------------------------------------------

async function tryKimiFilesApi(
  buffer: Buffer,
): Promise<DeterministicResult | null> {
  const warnings: string[] = [];

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    warnings.push("Kimi Files API fallback skipped: KIMI_API_KEY not set");
    return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
  }

  let fileId: string | null = null;

  try {
    // Step 1: Upload the PDF
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
      "document.pdf"
    );
    formData.append("purpose", "file-extract");

    const uploadRes = await fetch(`${KIMI_BASE_URL}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      warnings.push(`Kimi Files API upload failed: ${uploadRes.status} ${err}`);
      return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
    }

    const uploadData = await uploadRes.json();
    fileId = uploadData.id;

    if (uploadData.status === "error") {
      warnings.push(`Kimi file parsing failed: ${uploadData.status_details || "unknown error"}`);
      return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
    }

    // Step 2: Get extracted content
    const contentRes = await fetch(`${KIMI_BASE_URL}/files/${fileId}/content`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!contentRes.ok) {
      const err = await contentRes.text();
      warnings.push(`Kimi Files API content fetch failed: ${contentRes.status} ${err}`);
      return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
    }

    const contentText = await contentRes.text();

    // Parse the JSON response — Kimi returns { content, file_type, filename, ... }
    let extractedText: string;
    try {
      const parsed = JSON.parse(contentText);
      extractedText = parsed.content ?? contentText;
    } catch {
      extractedText = contentText;
    }

    // Clean up Kimi's HTML tags and normalize
    extractedText = extractedText
      .replace(/<header>.*?<\/header>/g, "")
      .replace(/<footer>.*?<\/footer>/g, "")
      .replace(/^#+\s*/gm, "")  // strip markdown headings (we'll re-structure later)
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!extractedText || extractedText.length < 50) {
      warnings.push("Kimi Files API returned very little content");
      return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
    }

    warnings.push("Extracted via Kimi Files API fallback (free)");

    return {
      textByPage: [{ page: 1, text: extractedText }],
      images: [],
      tables: [],
      warnings,
      isScanned: false,
    };
  } catch (e) {
    warnings.push(`Kimi Files API extraction failed: ${(e as Error).message}`);
    return { textByPage: [], images: [], tables: [], warnings, isScanned: true };
  } finally {
    // Clean up uploaded file from Kimi
    if (fileId && apiKey) {
      try {
        await fetch(`${KIMI_BASE_URL}/files/${fileId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
