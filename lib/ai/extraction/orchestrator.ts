// ---------------------------------------------------------------------------
// Content Extraction Pipeline — Orchestrator
//
// Cron-driven state machine. Each invocation processes ONE phase of ONE job.
// Phase 1: Download file from R2 + deterministic extraction (free)
// Phase 2: Image classification + OCR via Kimi K2.5 multimodal (cheap)
// Final: Flatten to sourceContent → auto-create AI Council pipeline job
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { extractionJob, contribution } from "@/database/schema";
import { eq, and, not, inArray, asc, sql } from "drizzle-orm";
import { downloadFromR2 } from "@/lib/r2";
import { createJob as createPipelineJob } from "@/lib/ai/orchestrator";
import type {
  DeterministicResult,
  InputFileType,
  ExtractedImage,
  ClassifiedImage,
} from "./types";

// ---------------------------------------------------------------------------
// Dynamic imports — keeps the orchestrator module lightweight at eval time
// ---------------------------------------------------------------------------

async function loadExtractors() {
  const [pdf, docx, pptx, image, video, multimodal] = await Promise.all([
    import("./pdf"),
    import("./docx"),
    import("./pptx"),
    import("./image"),
    import("./video"),
    import("./multimodal-kimi"),
  ]);
  return {
    extractFromPdf: pdf.extractFromPdf,
    extractFromDocx: docx.extractFromDocx,
    extractFromPptx: pptx.extractFromPptx,
    fileToExtractedImage: image.fileToExtractedImage,
    prepareImagesForKimi: image.prepareImagesForKimi,
    prepareVideoForKimi: video.prepareVideoForKimi,
    cleanupVideoFile: video.cleanupVideoFile,
    classifyImages: multimodal.classifyImages,
    ocrImage: multimodal.ocrImage,
    extractFromVideo: multimodal.extractFromVideo,
  };
}

/**
 * Minimum sourceContent length to consider an extraction meaningful.
 * A sourceContent of just "# Source: file.pdf" is ~25 chars — useless.
 * Anything under 200 chars means extraction effectively failed.
 */
const MIN_SOURCE_CONTENT_LENGTH = 200;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = ["completed", "failed"];

/** Max images to process per cron invocation (Phase 2) */
const IMAGES_PER_INVOCATION = 10;

// ---------------------------------------------------------------------------
// Main entry point — called by cron
// ---------------------------------------------------------------------------

export async function processNextExtraction(): Promise<{
  jobId: string;
  phase: number;
  status: string;
} | null> {
  // 1. Find the oldest non-terminal extraction job
  const [job] = await db
    .select()
    .from(extractionJob)
    .where(not(inArray(extractionJob.status, TERMINAL_STATUSES)))
    .orderBy(asc(extractionJob.createdAt))
    .limit(1);

  if (!job) return null;

  // Route to the appropriate phase
  try {
    switch (job.status) {
      case "pending":
        return await handlePhase1(job);
      case "downloading":
        return await handlePhase1(job); // retry download
      case "extracting":
        return await handlePhase1(job); // retry extraction
      case "classifying":
        return await handlePhase2(job);
      default:
        return null;
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    console.log(`[extraction] Job ${job.id} error: ${errorMsg}`);
    await handleFailure(job.id, job.retryCount, job.maxRetries, errorMsg);
    return { jobId: job.id, phase: job.currentPhase, status: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Download + Deterministic Extraction
// ---------------------------------------------------------------------------

async function handlePhase1(
  job: typeof extractionJob.$inferSelect
): Promise<{
  jobId: string;
  phase: number;
  status: string;
}> {
  console.log(
    `[extraction] Job ${job.id} Phase 1: downloading + extracting ${job.fileName}`
  );

  // Lazy-load extractors (avoids DOMMatrix crash from pdfjs-dist at module eval)
  const ext = await loadExtractors();

  // Update status to downloading
  await db
    .update(extractionJob)
    .set({
      status: "downloading",
      currentPhase: 1,
      startedAt: job.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, job.id));

  // Download file from R2
  const downloadResult = await downloadFromR2(job.fileKey);
  if (!downloadResult.success) {
    throw new Error(`Failed to download from R2: ${downloadResult.error}`);
  }

  const { data: fileBuffer } = downloadResult;

  // Update status to extracting
  await db
    .update(extractionJob)
    .set({ status: "extracting", updatedAt: new Date() })
    .where(eq(extractionJob.id, job.id));

  // Determine file type and extract
  const fileType = detectFileType(job.fileType, job.fileName);
  let result: DeterministicResult;

  switch (fileType) {
    case "pdf":
      result = await ext.extractFromPdf(fileBuffer);
      break;
    case "docx":
      result = await ext.extractFromDocx(fileBuffer);
      break;
    case "pptx":
      result = await ext.extractFromPptx(fileBuffer);
      break;
    case "image": {
      const img = await ext.fileToExtractedImage(fileBuffer, job.fileType);
      result = {
        textByPage: [],
        images: [img],
        tables: [],
        warnings: [],
        isScanned: true, // Images always need OCR
      };
      break;
    }
    case "video": {
      // Videos go directly to Kimi multimodal — no deterministic extraction
      const videoRef = await ext.prepareVideoForKimi(fileBuffer, job.fileType);
      const videoResult = await ext.extractFromVideo(videoRef.url);

      // Clean up uploaded file if applicable
      if (videoRef.fileId) {
        await ext.cleanupVideoFile(videoRef.fileId);
      }

      // Video extraction is complete — skip Phase 2, go straight to completion
      const sourceContent = buildSourceContent(
        job.fileName,
        [{ page: 1, text: videoResult.text }],
        [],
        [],
        undefined,
        ["Source is a video file — extracted via Kimi K2.5 multimodal"]
      );

      await db
        .update(extractionJob)
        .set({
          status: "completed",
          currentPhase: 2,
          sourceContent,
          extractionTokens: videoResult.tokens,
          extractionCostUsd: videoResult.cost.toFixed(6),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(extractionJob.id, job.id));

      // Auto-create pipeline job
      await autoCreatePipelineJob(job);

      console.log(
        `[extraction] Job ${job.id} completed (video) — $${videoResult.cost.toFixed(6)}`
      );
      return { jobId: job.id, phase: 2, status: "completed" };
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  console.log(
    `[extraction] Job ${job.id} Phase 1 done — ${result.textByPage.length} pages, ${result.images.length} images, ${result.tables.length} tables, scanned=${result.isScanned}`
  );

  // If no images and not scanned — skip Phase 2, go to completion
  if (result.images.length === 0 && !result.isScanned) {
    // Validate extraction produced meaningful content
    if (result.textByPage.length === 0 && result.tables.length === 0) {
      console.log(
        `[extraction] Job ${job.id} produced no text or tables — marking failed`
      );
      await db
        .update(extractionJob)
        .set({
          status: "failed",
          errorMessage: "Extraction produced no text content. The source file may be encrypted, corrupted, or empty.",
          extractedContent: result as any,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(extractionJob.id, job.id));
      return { jobId: job.id, phase: 1, status: "failed" };
    }

    const sourceContent = buildSourceContent(
      job.fileName,
      result.textByPage,
      result.tables,
      [],
      result.speakerNotes,
      result.warnings
    );

    if (sourceContent.length < MIN_SOURCE_CONTENT_LENGTH) {
      console.log(
        `[extraction] Job ${job.id} sourceContent too short (${sourceContent.length} chars) — marking failed`
      );
      await db
        .update(extractionJob)
        .set({
          status: "failed",
          errorMessage: `Extraction produced insufficient content (${sourceContent.length} chars). The source file may be mostly images or have very little text.`,
          extractedContent: result as any,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(extractionJob.id, job.id));
      return { jobId: job.id, phase: 1, status: "failed" };
    }

    await db
      .update(extractionJob)
      .set({
        status: "completed",
        currentPhase: 2,
        extractedContent: result as any,
        sourceContent,
        totalImages: 0,
        processedImages: 0,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(extractionJob.id, job.id));

    await autoCreatePipelineJob(job);

    console.log(`[extraction] Job ${job.id} completed (no images) — $0`);
    return { jobId: job.id, phase: 1, status: "completed" };
  }

  // Save Phase 1 results, transition to Phase 2
  await db
    .update(extractionJob)
    .set({
      status: "classifying",
      currentPhase: 2,
      extractedContent: result as any,
      totalImages: result.images.length,
      processedImages: 0,
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, job.id));

  return { jobId: job.id, phase: 1, status: "classifying" };
}

// ---------------------------------------------------------------------------
// Phase 2: Image Classification + OCR via Kimi K2.5
// ---------------------------------------------------------------------------

async function handlePhase2(
  job: typeof extractionJob.$inferSelect
): Promise<{
  jobId: string;
  phase: number;
  status: string;
}> {
  const extracted = job.extractedContent as unknown as DeterministicResult;
  if (!extracted) throw new Error("No extracted content for Phase 2");

  // Lazy-load extractors
  const ext = await loadExtractors();

  const allImages = extracted.images ?? [];
  const processed = job.processedImages;

  console.log(
    `[extraction] Job ${job.id} Phase 2: classifying images (${processed}/${allImages.length})`
  );

  // Get the next batch of unprocessed images
  const batch = allImages.slice(processed, processed + IMAGES_PER_INVOCATION);

  if (batch.length === 0) {
    // All images processed — finalize
    return await finalizeExtraction(job, extracted);
  }

  // Prepare images for Kimi (resize, optimize)
  const preparedImages = await ext.prepareImagesForKimi(batch);

  // Classify images
  const { classified, tokens, cost } = await ext.classifyImages(preparedImages);

  // For scanned documents or photo notes, run OCR on relevant images
  let ocrTokens = 0;
  let ocrCost = 0;
  const ocrTexts: { page: number; text: string }[] = [];

  for (const img of classified) {
    if (
      img.classification === "photo_notes" ||
      (extracted.isScanned && img.classification !== "decorative")
    ) {
      const ocrResult = await ext.ocrImage(img);
      ocrTexts.push({ page: img.pageOrSlide, text: ocrResult.text });
      ocrTokens += ocrResult.tokens;
      ocrCost += ocrResult.cost;
    }
  }

  // Update the extracted content with classified images
  // Store classified results in the extractedContent
  const updatedImages = [
    ...(allImages.slice(0, processed) as any[]),
    ...classified,
    ...allImages.slice(processed + batch.length),
  ];

  const updatedExtracted = {
    ...extracted,
    images: updatedImages,
    // Add OCR texts to the text pages
    textByPage: [...extracted.textByPage, ...ocrTexts],
  };

  const newProcessed = processed + batch.length;
  const totalTokens =
    (job.extractionTokens ?? 0) + tokens + ocrTokens;
  const totalCost =
    Number(job.extractionCostUsd ?? 0) + cost + ocrCost;

  await db
    .update(extractionJob)
    .set({
      extractedContent: updatedExtracted as any,
      processedImages: newProcessed,
      extractionTokens: totalTokens,
      extractionCostUsd: totalCost.toFixed(6),
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, job.id));

  console.log(
    `[extraction] Job ${job.id} Phase 2 batch done — ${newProcessed}/${allImages.length} images, $${(cost + ocrCost).toFixed(6)}`
  );

  // Check if all images are processed
  if (newProcessed >= allImages.length) {
    return await finalizeExtraction(job, updatedExtracted);
  }

  return { jobId: job.id, phase: 2, status: "classifying" };
}

// ---------------------------------------------------------------------------
// Finalization — flatten to sourceContent + auto-create pipeline job
// ---------------------------------------------------------------------------

async function finalizeExtraction(
  job: typeof extractionJob.$inferSelect,
  extracted: DeterministicResult
): Promise<{ jobId: string; phase: number; status: string }> {
  // Build image descriptions from classified images
  const imageDescriptions: {
    page: number;
    description: string;
    latex?: string;
  }[] = [];

  for (const img of (extracted.images ?? []) as ClassifiedImage[]) {
    if (img.classification === "decorative") continue;
    if (img.description || img.latex) {
      imageDescriptions.push({
        page: img.pageOrSlide,
        description: img.description ?? "",
        latex: img.latex,
      });
    }
  }

  const sourceContent = buildSourceContent(
    job.fileName,
    extracted.textByPage,
    extracted.tables,
    imageDescriptions,
    extracted.speakerNotes,
    extracted.warnings
  );

  // Validate that extraction produced meaningful content
  const hasText = extracted.textByPage.length > 0;
  const hasImages = imageDescriptions.length > 0;
  const hasTables = extracted.tables.length > 0;
  const hasNotes = (extracted.speakerNotes?.length ?? 0) > 0;
  const hasMeaningfulContent =
    (hasText || hasImages || hasTables || hasNotes) &&
    sourceContent.length >= MIN_SOURCE_CONTENT_LENGTH;

  if (!hasMeaningfulContent) {
    console.log(
      `[extraction] Job ${job.id} produced no meaningful content (${sourceContent.length} chars) — marking failed`
    );
    await db
      .update(extractionJob)
      .set({
        status: "failed",
        errorMessage: `Extraction produced no meaningful content (${sourceContent.length} chars, text=${hasText}, images=${hasImages}, tables=${hasTables}). The source file may be encrypted, corrupted, or empty.`,
        extractedContent: extracted as any,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(extractionJob.id, job.id));

    return { jobId: job.id, phase: 2, status: "failed" };
  }

  await db
    .update(extractionJob)
    .set({
      status: "completed",
      sourceContent,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, job.id));

  // Auto-create AI Council pipeline job
  await autoCreatePipelineJob(job);

  console.log(
    `[extraction] Job ${job.id} completed — ${sourceContent.length} chars, $${job.extractionCostUsd}`
  );

  return { jobId: job.id, phase: 2, status: "completed" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectFileType(
  mimeType: string,
  fileName: string
): InputFileType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  )
    return "docx";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  )
    return "pptx";
  if (
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
  )
    return "image";
  if (
    mimeType.startsWith("video/") ||
    ["mp4", "mov", "avi", "webm"].includes(ext)
  )
    return "video";

  // Fallback: try extension
  if (ext === "doc") return "docx"; // mammoth can handle .doc too
  if (ext === "ppt") return "pptx";

  throw new Error(`Unsupported file type: ${mimeType} (${fileName})`);
}

function buildSourceContent(
  fileName: string,
  textByPage: { page: number; text: string }[],
  tables: { headers: string[]; rows: string[][]; pageOrSlide: number }[],
  imageDescriptions: {
    page: number;
    description: string;
    latex?: string;
  }[],
  speakerNotes?: { slide: number; notes: string }[],
  warnings?: string[]
): string {
  const sections: string[] = [];

  sections.push(`# Source: ${fileName}`);

  // Text content
  if (textByPage.length > 0) {
    sections.push("## Text Content");
    for (const { page, text } of textByPage) {
      sections.push(`### Page ${page}`);
      sections.push(text);
    }
  }

  // Tables
  if (tables.length > 0) {
    sections.push("## Tables");
    for (const table of tables) {
      sections.push(`### Table (Page ${table.pageOrSlide})`);
      if (table.headers.length > 0) {
        sections.push(`| ${table.headers.join(" | ")} |`);
        sections.push(
          `| ${table.headers.map(() => "---").join(" | ")} |`
        );
      }
      for (const row of table.rows) {
        sections.push(`| ${row.join(" | ")} |`);
      }
    }
  }

  // Image descriptions
  if (imageDescriptions.length > 0) {
    sections.push("## Image Descriptions");
    for (const { page, description, latex } of imageDescriptions) {
      sections.push(`### Image (Page ${page})`);
      if (description) sections.push(description);
      if (latex) sections.push(`$$${latex}$$`);
    }
  }

  // Speaker notes (PPTX)
  if (speakerNotes && speakerNotes.length > 0) {
    sections.push("## Speaker Notes");
    for (const { slide, notes } of speakerNotes) {
      sections.push(`### Slide ${slide}`);
      sections.push(notes);
    }
  }

  // Warnings
  if (warnings && warnings.length > 0) {
    sections.push("## Warnings");
    for (const warning of warnings) {
      sections.push(`- ${warning}`);
    }
  }

  return sections.join("\n\n");
}

/**
 * Auto-create a pipeline job ONLY when ALL extractions for this course are done.
 * A course can have multiple files (PDFs, DOCX, PPTX, etc.) uploaded at once or
 * over time. We wait for every extraction to complete, then combine all their
 * sourceContent into one pipeline job so the AI Council reviews everything together.
 */
async function autoCreatePipelineJob(
  job: typeof extractionJob.$inferSelect
): Promise<void> {
  try {
    // Check if there are any sibling extractions still in progress for this course
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(extractionJob)
      .where(
        and(
          eq(extractionJob.courseId, job.courseId),
          not(inArray(extractionJob.status, ["completed", "failed"]))
        )
      );

    if (Number(pending.count) > 0) {
      console.log(
        `[extraction] Job ${job.id} done, but ${pending.count} sibling extraction(s) still in progress for course ${job.courseId} — waiting`
      );
      return;
    }

    // All extractions for this course are terminal — gather completed ones
    const completedJobs = await db
      .select({
        id: extractionJob.id,
        sourceContent: extractionJob.sourceContent,
        contributionId: extractionJob.contributionId,
        fileName: extractionJob.fileName,
      })
      .from(extractionJob)
      .where(
        and(
          eq(extractionJob.courseId, job.courseId),
          eq(extractionJob.status, "completed"),
          sql`${extractionJob.pipelineJobId} IS NULL` // not already linked to a pipeline
        )
      )
      .orderBy(asc(extractionJob.createdAt));

    if (completedJobs.length === 0) return;

    // Combine sourceContent from all completed extractions — only include meaningful ones
    const combinedSource = completedJobs
      .filter((j) => j.sourceContent && j.sourceContent.length >= MIN_SOURCE_CONTENT_LENGTH)
      .map((j) => j.sourceContent!)
      .join("\n\n---\n\n");

    if (!combinedSource || combinedSource.length < MIN_SOURCE_CONTENT_LENGTH) {
      console.log(
        `[extraction] Skipping pipeline creation — combined sourceContent too short (${combinedSource.length} chars)`
      );
      return;
    }

    const contributionIds = completedJobs.map((j) => j.contributionId);

    console.log(
      `[extraction] Creating pipeline job for course ${job.courseId} — ${completedJobs.length} file(s): ${completedJobs.map((j) => j.fileName).join(", ")}`
    );

    // Create ONE pipeline job with ALL sources combined
    const pipelineJobId = await createPipelineJob({
      courseId: job.courseId,
      contributionIds,
      outputTypes: ["study_guide", "flashcards", "quiz"],
      startedBy: "extraction-pipeline",
      sourceContent: combinedSource,
    });

    // Link ALL completed extraction jobs to this pipeline job
    for (const completedJob of completedJobs) {
      await db
        .update(extractionJob)
        .set({ pipelineJobId: pipelineJobId, updatedAt: new Date() })
        .where(eq(extractionJob.id, completedJob.id));
    }

    console.log(
      `[extraction] Auto-created pipeline job ${pipelineJobId} for ${completedJobs.length} extraction(s)`
    );
  } catch (e) {
    console.log(
      `[extraction] Failed to auto-create pipeline job: ${(e as Error).message}`
    );
    // Don't fail the extraction job — pipeline creation is optional
  }
}

async function handleFailure(
  jobId: string,
  currentRetryCount: number,
  maxRetries: number,
  errorMessage: string
): Promise<void> {
  if (currentRetryCount + 1 >= maxRetries) {
    await db
      .update(extractionJob)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(extractionJob.id, jobId));
  } else {
    // Reset to pending for retry
    await db
      .update(extractionJob)
      .set({
        status: "pending",
        retryCount: currentRetryCount + 1,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(extractionJob.id, jobId));
  }
}

// ---------------------------------------------------------------------------
// cancelExtractionJob — marks an extraction job as failed/cancelled
// ---------------------------------------------------------------------------

export async function cancelExtractionJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(extractionJob)
    .where(eq(extractionJob.id, jobId))
    .limit(1);

  if (!job || TERMINAL_STATUSES.includes(job.status)) {
    return false;
  }

  await db
    .update(extractionJob)
    .set({
      status: "failed",
      errorMessage: "Cancelled by admin",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, jobId));

  return true;
}

// ---------------------------------------------------------------------------
// retryExtractionJob — resets a failed extraction job to pending
// ---------------------------------------------------------------------------

export async function retryExtractionJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(extractionJob)
    .where(eq(extractionJob.id, jobId))
    .limit(1);

  if (!job || job.status !== "failed") {
    return false;
  }

  await db
    .update(extractionJob)
    .set({
      status: "pending",
      errorMessage: null,
      completedAt: null,
      retryCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, jobId));

  return true;
}

// ---------------------------------------------------------------------------
// createExtractionJob — creates a new extraction job for a contribution
// ---------------------------------------------------------------------------

export async function createExtractionJob(params: {
  contributionId: number;
  courseId: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}): Promise<string> {
  const [job] = await db
    .insert(extractionJob)
    .values({
      contributionId: params.contributionId,
      courseId: params.courseId,
      fileName: params.fileName,
      fileKey: params.fileKey,
      fileUrl: params.fileUrl,
      fileType: params.fileType,
      fileSize: params.fileSize ?? null,
      status: "pending",
      currentPhase: 0,
      totalImages: 0,
      processedImages: 0,
      extractionTokens: 0,
      extractionCostUsd: "0",
      retryCount: 0,
    })
    .returning({ id: extractionJob.id });

  return job.id;
}
