// ---------------------------------------------------------------------------
// DOCX Extraction — Phase 1 deterministic
// Uses mammoth to extract text, images, and tables from Word documents.
// DOCX files always have a text layer, so isScanned is always false.
// ---------------------------------------------------------------------------

import mammoth from "mammoth";
import type {
  DeterministicResult,
  ExtractedImage,
  ExtractedTable,
} from "./types";

/**
 * Extract text, images, and tables from a DOCX buffer.
 *
 * - Uses mammoth.extractRawText for clean plain-text extraction.
 * - Uses mammoth.convertToHtml with images.imgElement to capture every
 *   embedded image as base64.
 * - Parses HTML tables into structured headers + rows.
 * - DOCX files are treated as a single "page" (page 1) because Word
 *   documents don't have a native page concept at the XML level.
 */
export async function extractFromDocx(
  buffer: Buffer,
): Promise<DeterministicResult> {
  const warnings: string[] = [];
  const images: ExtractedImage[] = [];
  const tables: ExtractedTable[] = [];
  let imageCounter = 0;

  try {
    // --- Raw text extraction ---------------------------------------------------
    const textResult = await mammoth.extractRawText({ buffer });

    for (const msg of textResult.messages) {
      if (msg.type === "warning") {
        warnings.push(`DOCX warning: ${msg.message}`);
      }
    }

    // --- HTML extraction (for images + tables) ---------------------------------
    const htmlResult = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement((image) => {
          return image.read("base64").then((base64Data: string) => {
            imageCounter++;
            const mimeType = image.contentType || "image/png";
            images.push({
              base64: base64Data,
              mimeType,
              pageOrSlide: 1, // DOCX = single continuous document
            });
            // Return a placeholder src — we only need the side-effect above
            return { src: `image-${imageCounter}` };
          });
        }),
      },
    );

    // --- Table extraction from HTML --------------------------------------------
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(htmlResult.value)) !== null) {
      const parsed = parseHtmlTable(tableMatch[1]);
      if (parsed) {
        tables.push({ ...parsed, pageOrSlide: 1 });
      }
    }

    // --- Assemble text-by-page (single page for DOCX) --------------------------
    const fullText = textResult.value.trim();
    const textByPage = fullText ? [{ page: 1, text: fullText }] : [];

    return {
      textByPage,
      images,
      tables,
      warnings,
      isScanned: false, // DOCX always has a text layer
    };
  } catch (e) {
    warnings.push(`DOCX extraction failed: ${(e as Error).message}`);
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
 * Parse an HTML `<table>` body into a structured { headers, rows } object.
 *
 * Strategy:
 * 1. Look for `<th>` cells — if found, they become headers.
 * 2. Otherwise, the first `<tr>` with `<td>` cells becomes the header row.
 * 3. Remaining `<tr>` rows become data rows.
 */
function parseHtmlTable(
  tableHtml: string,
): { headers: string[]; rows: string[][] } | null {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Try to extract header cells from <th> tags
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let thMatch;
  while ((thMatch = thRegex.exec(tableHtml)) !== null) {
    headers.push(stripHtml(thMatch[1]).trim());
  }

  // Walk every <tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let isFirstRow = true;

  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    // If we already got headers from <th>, skip the first <tr> (it contained them)
    if (isFirstRow && headers.length > 0) {
      isFirstRow = false;
      continue;
    }
    isFirstRow = false;

    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(stripHtml(tdMatch[1]).trim());
    }

    if (cells.length > 0) {
      // Promote first data row to headers when no <th> was found
      if (headers.length === 0 && rows.length === 0) {
        headers.push(...cells);
      } else {
        rows.push(cells);
      }
    }
  }

  if (headers.length === 0 && rows.length === 0) return null;
  return { headers, rows };
}

/** Strip all HTML tags from a string, returning plain text. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
