// ---------------------------------------------------------------------------
// PDF Extraction — Phase 1 deterministic
// Uses pdf-parse v2 (class-based API) for text and table extraction.
// Detects scanned/image-only PDFs (no text layer) so the pipeline can fall
// back to Kimi K2.5 multimodal OCR in Phase 2.
// ---------------------------------------------------------------------------

import { PDFParse } from "pdf-parse";
import type { DeterministicResult, ExtractedTable } from "./types";

/**
 * Minimum average text characters per page to consider the PDF as having a
 * real text layer (i.e. not a scanned document).
 */
const MIN_TEXT_PER_PAGE = 20;

/**
 * Extract text and tables from a PDF buffer.
 *
 * - Uses PDFParse.getText() for per-page text extraction.
 * - Uses PDFParse.getTable() for structured table detection.
 * - Flags scanned PDFs (below MIN_TEXT_PER_PAGE threshold) so the pipeline
 *   can route them through Kimi multimodal OCR.
 * - Images are NOT extracted here — they are handled in Phase 2 by Kimi
 *   multimodal when needed.
 */
export async function extractFromPdf(
  buffer: Buffer,
): Promise<DeterministicResult> {
  const warnings: string[] = [];
  const textByPage: { page: number; text: string }[] = [];
  const tables: ExtractedTable[] = [];

  let parser: PDFParse | null = null;

  try {
    // pdf-parse v2 accepts data as Uint8Array via LoadParameters
    parser = new PDFParse({ data: new Uint8Array(buffer) });

    // --- Text extraction (per-page) ------------------------------------------
    const textResult = await parser.getText({
      pageJoiner: "", // no page boundary markers — we read pages individually
    });

    for (const page of textResult.pages) {
      const pageText = page.text.trim();
      if (pageText) {
        textByPage.push({ page: page.num, text: pageText });
      }
    }

    // --- Scanned-PDF detection -----------------------------------------------
    const totalTextLength = textResult.text.replace(/\s/g, "").length;
    const numPages = textResult.total || Math.max(textResult.pages.length, 1);
    const avgTextPerPage = totalTextLength / numPages;
    const isScanned = avgTextPerPage < MIN_TEXT_PER_PAGE;

    if (isScanned) {
      warnings.push(
        `PDF appears to be scanned/image-only (avg ${Math.round(avgTextPerPage)} chars/page). ` +
          `Will use Kimi K2.5 multimodal OCR.`,
      );
    }

    // --- Table extraction ----------------------------------------------------
    try {
      const tableResult = await parser.getTable();

      for (const page of tableResult.pages) {
        for (const tableData of page.tables) {
          // tableData is TableArray = string[][] — first row treated as headers
          if (tableData.length > 0) {
            tables.push({
              headers: tableData[0],
              rows: tableData.slice(1),
              pageOrSlide: page.num,
            });
          }
        }
      }
    } catch (e) {
      warnings.push(
        `PDF table extraction failed: ${(e as Error).message}. Tables will be processed via Kimi multimodal.`,
      );
    }

    return {
      textByPage,
      images: [], // extracted in Phase 2 via Kimi multimodal when needed
      tables,
      warnings,
      isScanned,
    };
  } catch (e) {
    warnings.push(`PDF extraction failed: ${(e as Error).message}`);
    return {
      textByPage: [],
      images: [],
      tables: [],
      warnings,
      isScanned: true,
    };
  } finally {
    // Clean up the parser to release pdfjs resources
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
