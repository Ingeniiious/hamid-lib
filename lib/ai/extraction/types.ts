// ---------------------------------------------------------------------------
// Content Extraction Pipeline — Type Definitions
// ---------------------------------------------------------------------------

/** Status of an extraction job */
export type ExtractionStatus =
  | "pending"      // waiting to be picked up
  | "downloading"  // downloading file from R2
  | "extracting"   // Phase 1: deterministic extraction
  | "classifying"  // Phase 2: Kimi multimodal classification
  | "completed"    // done — sourceContent ready
  | "failed";

/** Supported input file types */
export type InputFileType = "pdf" | "docx" | "pptx" | "image" | "video";

/** Image classification categories from Kimi K2.5 multimodal */
export type ImageClassification =
  | "content_diagram"   // diagrams, charts, graphs with educational value
  | "equation"          // mathematical equations, formulas
  | "photo_notes"       // photos of handwritten notes, whiteboard
  | "table_image"       // table captured as image
  | "decorative";       // logos, decorations, headers — discard

/** Raw extracted image before classification */
export interface ExtractedImage {
  /** Base64 encoded image data */
  base64: string;
  /** MIME type (image/png, image/jpeg, etc.) */
  mimeType: string;
  /** Source page (PDF) or slide number (PPTX), 1-indexed */
  pageOrSlide: number;
  /** Original width in pixels (if known) */
  width?: number;
  /** Original height in pixels (if known) */
  height?: number;
}

/** Image after Kimi K2.5 classification */
export interface ClassifiedImage extends ExtractedImage {
  classification: ImageClassification;
  /** Text description of the image content (for content_diagram, photo_notes, table_image) */
  description?: string;
  /** LaTeX representation (for equation type) */
  latex?: string;
}

/** Extracted table structure */
export interface ExtractedTable {
  /** Table headers */
  headers: string[];
  /** Table data rows */
  rows: string[][];
  /** Source page or slide number */
  pageOrSlide: number;
}

/** Result from Phase 1 deterministic extraction */
export interface DeterministicResult {
  /** Extracted plain text, organized by page/slide */
  textByPage: { page: number; text: string }[];
  /** Extracted images */
  images: ExtractedImage[];
  /** Extracted tables */
  tables: ExtractedTable[];
  /** Speaker notes (PPTX only) */
  speakerNotes?: { slide: number; notes: string }[];
  /** Extraction warnings/issues */
  warnings: string[];
  /** Whether the source appears to be a scanned/image-only document */
  isScanned: boolean;
}

/** Final flattened extraction output */
export interface ExtractionOutput {
  /** Structured markdown source content (fed to AI Council) */
  sourceContent: string;
  /** Structured extraction data */
  extractedData: {
    text: string;
    tables: ExtractedTable[];
    imageDescriptions: { page: number; description: string; latex?: string }[];
    speakerNotes?: { slide: number; notes: string }[];
    warnings: string[];
  };
  /** Extraction cost in USD */
  costUsd: number;
  /** Total tokens used in Kimi multimodal calls */
  totalTokens: number;
}
