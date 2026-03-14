// ---------------------------------------------------------------------------
// AI Council — Publisher
//
// After the 5-teacher verification pipeline completes, the publisher:
// 1. Extracts the best verified content (Grok's enrichedContent or fallback)
// 2. Creates generation steps for each requested output type
// 3. For MULTI-VARIANT types (exams, quizzes, flashcards, interactive):
//    each of the 5 models creates a unique variant — different AIs think
//    differently, so students get 5 diverse question sets / card decks
// 4. For SINGLE-OUTPUT types (study guide, podcast, video, slides, etc.):
//    Kimi generates from verified content (cheapest, one polished result)
// 5. Each generated result is saved to `generated_content`
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import {
  pipelineJob,
  pipelineStep,
  generatedContent,
  aiModelConfig,
} from "@/database/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { complete } from "@/lib/ai/client";
import { calculateStepCost } from "@/lib/ai/cost";
import { getGeneratorPrompt } from "@/lib/ai/prompts";
import type { ModelSlug, ContentType, ModelRole } from "@/lib/ai/types";
import { validateGeneratedContent } from "@/lib/ai/content-schemas";

// ---------------------------------------------------------------------------
// Get best verified content from completed teacher steps
// ---------------------------------------------------------------------------

/**
 * Walk the completed teacher steps (in reverse pipeline order) to find the
 * best verified content. Grok (fact_checker) is last, so its enrichedContent
 * is the most refined. Falls back through the chain.
 */
export function getBestVerifiedContent(
  steps: (typeof pipelineStep.$inferSelect)[]
): { content: string; sourceModelSlug: string } | null {
  // Sort by stepOrder descending — prefer later teachers (more refined)
  const completed = steps
    .filter((s) => s.status === "completed" && s.role !== "generator")
    .sort((a, b) => b.stepOrder - a.stepOrder);

  for (const step of completed) {
    const output = step.output as Record<string, unknown> | null;
    if (!output) continue;

    // Gating roles (reviewer, validator, fact_checker) store enrichedContent
    if (output.enrichedContent) {
      const enriched = output.enrichedContent;
      return {
        content: typeof enriched === "string" ? enriched : JSON.stringify(enriched),
        sourceModelSlug: step.modelSlug,
      };
    }

    // Enricher stores the content directly
    if (output.content || output.sections || output.cards || output.questions) {
      return {
        content: typeof output === "string" ? output : JSON.stringify(output),
        sourceModelSlug: step.modelSlug,
      };
    }
  }

  // Fallback: use creator's raw output
  const creator = steps.find((s) => s.role === "creator" && s.status === "completed");
  if (creator?.output) {
    const out = creator.output as Record<string, unknown>;
    return {
      content: out.content
        ? (out.content as string)
        : JSON.stringify(out),
      sourceModelSlug: creator.modelSlug,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Create generation steps after teacher pipeline completes
// ---------------------------------------------------------------------------

/**
 * Creates pipeline_step rows for content generation.
 * Called when all 5 teacher steps finish — transitions job to "generating" phase.
 *
 * Returns the number of generation steps created.
 */
export async function createGenerationSteps(jobId: string): Promise<number> {
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(eq(pipelineJob.id, jobId))
    .limit(1);

  if (!job) return 0;

  const outputTypes = job.outputTypes as string[];
  if (!outputTypes || outputTypes.length === 0) return 0;

  // Idempotency guard — prevent duplicate generation steps on race condition
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.role, "generator")
      )
    );
  if (Number(existing.count) > 0) return 0;

  // Fetch all enabled models for exam variants
  const models = await db
    .select()
    .from(aiModelConfig)
    .where(eq(aiModelConfig.enabled, true))
    .orderBy(asc(aiModelConfig.pipelineOrder));

  const generationSteps: {
    jobId: string;
    modelSlug: string;
    role: string;
    stepOrder: number;
    status: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
    retryCount: number;
    inputSummary: string | null;
  }[] = [];

  // Content types where each AI model generates its own unique variant.
  // Different AIs think differently → students get 5 diverse sets of questions,
  // flashcard decks, exam papers, etc. This is a key value proposition.
  const MULTI_VARIANT_TYPES = new Set([
    "mock_exam",          // 5 unique exam papers
    "quiz",               // 5 unique quiz sets
    "flashcards",         // 5 unique flashcard decks
    "interactive_section", // 5 unique interactive exercises
  ]);

  // Generation steps start after the teacher steps (stepOrder 100+)
  let stepOrder = 100;

  for (const outputType of outputTypes) {
    if (MULTI_VARIANT_TYPES.has(outputType)) {
      // Each model creates its own unique variant — 5 different perspectives
      for (const model of models) {
        generationSteps.push({
          jobId: job.id,
          modelSlug: model.slug,
          role: "generator",
          stepOrder: stepOrder++,
          status: "pending",
          inputTokens: 0,
          outputTokens: 0,
          costUsd: "0",
          retryCount: 0,
          inputSummary: `generate:${outputType}`,
        });
      }
    } else {
      // Single-output types (study guide, podcast, video, slides, etc.)
      // Use Kimi (cheapest) — one polished result is enough
      generationSteps.push({
        jobId: job.id,
        modelSlug: "kimi",
        role: "generator",
        stepOrder: stepOrder++,
        status: "pending",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: "0",
        retryCount: 0,
        inputSummary: `generate:${outputType}`,
      });
    }
  }

  if (generationSteps.length === 0) return 0;

  await db.insert(pipelineStep).values(generationSteps);

  // Update job status to generating
  await db
    .update(pipelineJob)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(pipelineJob.id, jobId));

  console.log(
    `[publisher] Created ${generationSteps.length} generation step(s) for job ${jobId}: ${outputTypes.join(", ")}`
  );

  return generationSteps.length;
}

// ---------------------------------------------------------------------------
// Process a single generation step
// ---------------------------------------------------------------------------

/**
 * Generates content for one output type and saves to `generated_content`.
 * Called by the orchestrator when processing a "generator" role step.
 */
export async function processGenerationStep(
  step: typeof pipelineStep.$inferSelect,
  job: typeof pipelineJob.$inferSelect,
  config: { slug: string; modelId: string; maxOutputTokens: number; costPerInputToken: number; costPerOutputToken: number; config: Record<string, unknown> | null }
): Promise<{
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  content: string;
}> {
  // Parse the content type from inputSummary (format: "generate:study_guide")
  const contentType = (step.inputSummary?.replace("generate:", "") ?? "study_guide") as ContentType;

  // Get all completed teacher steps for this job
  const teacherSteps = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "completed")
      )
    )
    .orderBy(asc(pipelineStep.stepOrder));

  // Get the best verified content from teacher outputs
  const verified = getBestVerifiedContent(teacherSteps);
  if (!verified) {
    throw new Error("No verified content available from teacher steps");
  }

  // Get source content (stored on first step)
  const sourceContent = teacherSteps[0]?.inputSummary ?? "";

  // Build prompt — pass explicit source language to prevent wrong language generation
  const prompt = getGeneratorPrompt(contentType, verified.content, sourceContent, job.sourceLanguage);

  // Call AI
  const response = await complete({
    model: config.slug as ModelSlug,
    modelId: config.modelId,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: (config.config?.temperature as number | undefined) ?? 0.4,
    maxTokens: config.maxOutputTokens,
    responseFormat: "json",
  });

  // Parse generated content — strip markdown fences if model wrapped JSON in ```json ... ```
  let parsed: Record<string, unknown>;
  try {
    let raw = response.content.trim();
    const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (fenceMatch) raw = fenceMatch[1].trim();
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Generator returned invalid JSON for ${contentType}`);
  }

  // Validate schema — ensure the AI output matches the expected structure
  const validation = validateGeneratedContent(contentType, parsed);
  if (!validation.success) {
    throw new Error(
      `Generator output failed schema validation for ${contentType}: ${validation.errors.join("; ")}`
    );
  }
  parsed = validation.data;

  const costUsd =
    response.inputTokens * config.costPerInputToken +
    response.outputTokens * config.costPerOutputToken;

  // Determine title — for multi-variant types, include the model name
  const MULTI_VARIANT_TYPES = new Set(["mock_exam", "quiz", "flashcards", "interactive_section"]);
  const title = MULTI_VARIANT_TYPES.has(contentType)
    ? `${generateTitle(contentType, job)} — Variant ${config.slug}`
    : generateTitle(contentType, job);

  // Save to generated_content — use the detected source language, not hardcoded "en"
  await db.insert(generatedContent).values({
    courseId: job.courseId,
    jobId: job.id,
    contentType,
    title,
    content: parsed,
    language: job.sourceLanguage ?? "en",
    modelSource: config.slug,
    version: job.version,
    isPublished: false,
  });

  console.log(
    `[publisher] Generated ${contentType} for job ${job.id} via ${config.slug} — $${costUsd.toFixed(6)}`
  );

  return {
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    costUsd,
    content: response.content,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTitle(contentType: ContentType, job: typeof pipelineJob.$inferSelect): string {
  const labels: Record<string, string> = {
    study_guide: "Study Guide",
    flashcards: "Flashcards",
    quiz: "Quiz",
    mock_exam: "Mock Exam",
    podcast_script: "Podcast Script",
    video_script: "Video Script",
    mind_map: "Mind Map",
    infographic_data: "Infographic",
    slide_deck: "Slide Deck",
    data_table: "Data Table",
    report: "Report",
    interactive_section: "Interactive Section",
  };
  return labels[contentType] ?? contentType;
}
