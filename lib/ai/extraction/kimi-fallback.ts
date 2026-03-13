// ---------------------------------------------------------------------------
// Kimi Files API — shared fallback extractor for any document type
//
// Kimi Files API supports PDF, DOCX, PPTX, XLS, XLSX, DOC, PPT, images,
// and 40+ more formats. File parsing is currently FREE.
// Used as fallback when local libraries (unpdf, mammoth, adm-zip) fail.
// ---------------------------------------------------------------------------

import type { DeterministicResult } from "./types";

const KIMI_BASE_URL = "https://api.moonshot.ai/v1";

/** MIME types for common document formats */
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Extract text from any document via Kimi Files API.
 * Upload → get extracted content → clean up.
 *
 * Returns null on failure (caller should handle).
 */
export async function extractViaKimi(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<DeterministicResult | null> {
  const warnings: string[] = [];

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.log("[kimi-fallback] KIMI_API_KEY not set — skipping fallback");
    return null;
  }

  // Determine MIME type from filename if not provided
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const resolvedMime = mimeType || MIME_TYPES[ext] || "application/octet-stream";

  let fileId: string | null = null;

  try {
    // Step 1: Upload the file
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: resolvedMime }),
      fileName
    );
    formData.append("purpose", "file-extract");

    const uploadRes = await fetch(`${KIMI_BASE_URL}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.log(`[kimi-fallback] Upload failed: ${uploadRes.status} ${err}`);
      return null;
    }

    const uploadData = await uploadRes.json();
    fileId = uploadData.id;

    if (uploadData.status === "error") {
      console.log(`[kimi-fallback] File parsing error: ${uploadData.status_details}`);
      return null;
    }

    // Step 2: Get extracted content
    const contentRes = await fetch(`${KIMI_BASE_URL}/files/${fileId}/content`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!contentRes.ok) {
      const err = await contentRes.text();
      console.log(`[kimi-fallback] Content fetch failed: ${contentRes.status} ${err}`);
      return null;
    }

    const contentText = await contentRes.text();

    // Parse the JSON response
    let extractedText: string;
    try {
      const parsed = JSON.parse(contentText);
      extractedText = parsed.content ?? contentText;
    } catch {
      extractedText = contentText;
    }

    // Clean up Kimi's artifacts
    extractedText = extractedText
      .replace(/<header>.*?<\/header>/g, "")
      .replace(/<footer>.*?<\/footer>/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!extractedText || extractedText.length < 50) {
      console.log("[kimi-fallback] Extracted content too short");
      return null;
    }

    warnings.push("Extracted via Kimi Files API fallback (free)");

    console.log(
      `[kimi-fallback] Successfully extracted ${extractedText.length} chars from ${fileName}`
    );

    return {
      textByPage: [{ page: 1, text: extractedText }],
      images: [],
      tables: [],
      warnings,
      isScanned: false,
    };
  } catch (e) {
    console.log(`[kimi-fallback] Error: ${(e as Error).message}`);
    return null;
  } finally {
    // Clean up uploaded file
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
