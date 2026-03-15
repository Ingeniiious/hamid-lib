// ---------------------------------------------------------------------------
// AI Teachers' Council -- Pipeline Orchestrator (Batch Architecture)
//
// Cron-driven state machine with BATCH API support.
//
// KEY DIFFERENCE from orchestrator.ts (real-time):
//   Steps 2-5 (GPT, Claude, Gemini, Grok) use provider Batch APIs instead
//   of synchronous real-time calls. Each cron invocation takes 1-5s instead
//   of gambling on 100-270s API calls that can timeout on Vercel.
//
// Architecture:
//   Step 1 (Kimi Creator)      → real-time (fast, cheap, no batch API)
//   Step 2 (GPT Reviewer)      → BATCH API (submit 1s, poll 1s, 50% discount)
//   Step 3 (Claude Enricher)   → BATCH API (submit 1s, poll 1s, 50% discount)
//   Step 4 (Gemini Validator)  → BATCH API (submit 1s, poll 1s, 50% discount)
//   Step 5 (Grok Fact Checker) → BATCH API (submit 1s, poll 1s, 50% discount)
//   Generation steps → real-time (delegated to publisher)
//
// Admin toggle: each model's config.useBatch flag (JSONB) controls whether
//   batch or real-time is used. Defaults to true for batch-capable models.
//
// Flow per cron invocation:
//   1. Poll any batch_submitted steps → process completed results
//   2. Recover stale real-time steps (skip batch steps — they can take 24h)
//   3. Find next pending step → submit batch or call real-time
//   4. Return fast (< 5s for batch ops, < 270s for real-time ops)
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import {
  aiModelConfig,
  pipelineJob,
  pipelineStep,
  course,
  faculty,
  contribution,
  contributorStats,
} from "@/database/schema";
import {
  eq,
  and,
  not,
  inArray,
  asc,
  sql,
} from "drizzle-orm";
import { complete } from "@/lib/ai/client";
import { calculateStepCost } from "@/lib/ai/cost";
import { getPrompt, type CourseContext } from "@/lib/ai/prompts";
import { createGenerationSteps, processGenerationStep } from "@/lib/ai/publisher";
import { supportsBatch, submitBatch, checkBatch, cancelBatch } from "@/lib/ai/batch";
import type {
  ModelSlug,
  ModelRole,
  PipelineStatus,
  ModelConfig,
  AIMessage,
  AICompletionResponse,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Propagate pipeline result back to linked contributions.
 * Updates contribution status, rejection info, and dispatches notifications.
 */
async function propagateToContributions(
  contributionIds: number[],
  update: {
    status: "processing" | "approved" | "rejected";
    rejectionSource?: "ai" | "admin";
    rejectionReason?: string;
  }
): Promise<void> {
  if (contributionIds.length === 0) return;
  try {
    const setValues: Record<string, unknown> = {
      status: update.status,
      updatedAt: new Date(),
    };
    if (update.rejectionSource) setValues.rejectionSource = update.rejectionSource;
    if (update.rejectionReason) setValues.rejectionReason = update.rejectionReason;

    await db
      .update(contribution)
      .set(setValues)
      .where(inArray(contribution.id, contributionIds));

    for (const contribId of contributionIds) {
      try {
        const [c] = await db
          .select({ userId: contribution.userId, title: contribution.title })
          .from(contribution)
          .where(eq(contribution.id, contribId))
          .limit(1);
        if (!c) continue;

        const { dispatchNotification } = await import("@/lib/notification-dispatch");

        if (update.status === "rejected") {
          await dispatchNotification(c.userId, {
            category: "contribution",
            title: "Contribution Rejected",
            body: `Your contribution "${c.title}" was not accepted: ${update.rejectionReason || "Content validation failed"}`,
            url: "/dashboard/contribute/my",
            metadata: { contributionId: contribId, reason: update.rejectionReason },
          });
        } else if (update.status === "approved") {
          await dispatchNotification(c.userId, {
            category: "contribution",
            title: "Contribution Approved",
            body: `Your contribution "${c.title}" has been approved! New content is on its way.`,
            url: "/dashboard/contribute/my",
            metadata: { contributionId: contribId },
          });
          await db
            .update(contributorStats)
            .set({
              approvedContributions: sql`${contributorStats.approvedContributions} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(contributorStats.userId, c.userId));
        }
      } catch (notifErr) {
        console.log(`[ai-pipeline-batch] Failed to notify for contribution ${contribId}: ${(notifErr as Error).message}`);
      }
    }
  } catch (e) {
    console.log(`[ai-pipeline-batch] Failed to propagate to contributions: ${(e as Error).message}`);
  }
}

const TERMINAL_STATUSES: PipelineStatus[] = ["completed", "failed", "cancelled"];

/** Timeout for real-time AI calls (Kimi, Gemini, Grok). Vercel Pro allows 300s. */
const AI_CALL_TIMEOUT_MS = 270_000;

/**
 * Stale threshold for REAL-TIME steps only.
 * Batch steps are exempt — they can legitimately take up to 24h.
 */
const STALE_RUNNING_THRESHOLD_MS = 280_000;

/** Maps a model role to the job status shown while that step runs. */
const ROLE_TO_JOB_STATUS: Record<ModelRole, PipelineStatus> = {
  creator: "extracting",
  reviewer: "reviewing",
  enricher: "enriching",
  validator: "validating",
  fact_checker: "fact_checking",
  generator: "generating",
};

/** Roles whose output carries a verdict that can reject the whole job. */
const GATING_ROLES: ModelRole[] = ["reviewer", "validator", "fact_checker"];

/** Roles that return JSON (gating roles + enricher). */
const JSON_ROLES: ModelRole[] = ["reviewer", "validator", "fact_checker", "enricher"];

/** Roles that can be skipped on failure without killing the job. */
const SKIPPABLE_ROLES: ModelRole[] = ["reviewer", "enricher", "validator", "fact_checker", "generator"];

/** Error patterns that indicate a permanent failure — no point retrying. */
const PERMANENT_ERROR_PATTERNS = [
  "api key",
  "apikey",
  "unauthorized",
  "forbidden",
  "invalid.*key",
  "authentication",
  "not set",
  "permission",
];

/** Finish reasons that indicate truncated output. */
const TRUNCATION_REASONS = ["length", "max_tokens", "MAX_TOKENS", "model_context_window_exceeded"];

function isPermanentError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return PERMANENT_ERROR_PATTERNS.some((p) => new RegExp(p).test(lower));
}

/**
 * Turn a raw ai_model_config row into a typed ModelConfig.
 * Numeric columns come back as strings from Drizzle/Neon — coerce them.
 */
function toModelConfig(row: typeof aiModelConfig.$inferSelect): ModelConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug as ModelSlug,
    provider: row.provider,
    modelId: row.modelId,
    role: row.role as ModelRole,
    pipelineOrder: row.pipelineOrder,
    costPerInputToken: Number(row.costPerInputToken ?? 0),
    costPerOutputToken: Number(row.costPerOutputToken ?? 0),
    maxInputTokens: row.maxInputTokens ?? 128_000,
    maxOutputTokens: row.maxOutputTokens ?? 8_192,
    enabled: row.enabled,
    config: row.config as Record<string, unknown> | null,
  };
}

// ---------------------------------------------------------------------------
// processCompletionResponse — shared result handler for both batch and real-time
// ---------------------------------------------------------------------------

/**
 * Process a completion response (from batch result or real-time call).
 * Handles: truncation check, JSON parsing, verdict extraction, step save,
 * job totals update, gating rejection, and job completion check.
 */
async function processCompletionResponse(
  step: typeof pipelineStep.$inferSelect,
  job: typeof pipelineJob.$inferSelect,
  response: AICompletionResponse,
  config: ModelConfig,
  startTime: number,
): Promise<{ jobId: string; step: number; status: string }> {
  const role = step.role as ModelRole;
  const isGatingRole = GATING_ROLES.includes(role);
  const isJsonRole = JSON_ROLES.includes(role);
  const durationMs = Date.now() - startTime;
  const costUsd = calculateStepCost(response.inputTokens, response.outputTokens, config);

  // Check for truncated output
  if (TRUNCATION_REASONS.includes(response.finishReason)) {
    const errorMsg = `Output truncated (finish_reason=${response.finishReason}) — model hit token limit (${config.maxOutputTokens}). Consider increasing max_output_tokens for ${step.modelSlug}.`;
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} truncated: ${errorMsg}`);
    const action = await handleStepFailure(step, job, errorMsg);
    return { jobId: job.id, step: step.stepOrder, status: action };
  }

  // Parse output
  let parsed: Record<string, unknown> | null = null;
  let verdict: string | null = null;
  let issues: unknown[] | null = null;

  if (isJsonRole) {
    try {
      // Strip markdown fences if model wrapped JSON in ```json ... ```
      let rawJson = response.content.trim();
      const fenceMatch = rawJson.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
      if (fenceMatch) rawJson = fenceMatch[1].trim();
      parsed = JSON.parse(rawJson);

      // Content validation check — creator step may reject invalid contributions
      if (role === "creator" && parsed?.validation === "rejected") {
        const reason = (parsed.reason as string) || "Content validation failed";
        console.log(`[ai-pipeline] Job ${job.id} REJECTED by content validation: ${reason}`);

        await db.update(pipelineStep).set({
          status: "completed",
          output: parsed,
          verdict: "rejected",
          issues: [{ field: "validation", description: reason, severity: "critical" }] as any,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          costUsd: costUsd.toFixed(6),
          completedAt: new Date(),
          durationMs,
        }).where(eq(pipelineStep.id, step.id));

        await db.update(pipelineJob).set({
          status: "failed",
          errorMessage: `Content validation rejected: ${reason}`,
          totalInputTokens: sql`${pipelineJob.totalInputTokens} + ${response.inputTokens}`,
          totalOutputTokens: sql`${pipelineJob.totalOutputTokens} + ${response.outputTokens}`,
          totalCostUsd: sql`${pipelineJob.totalCostUsd} + ${costUsd}`,
          completedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(pipelineJob.id, job.id));

        // Propagate rejection to linked contributions
        await propagateToContributions(job.contributionIds as number[], {
          status: "rejected",
          rejectionSource: "ai",
          rejectionReason: reason,
        });

        return { jobId: job.id, step: step.stepOrder, status: "rejected" };
      }

      // Extract verdict/issues for gating roles
      if (isGatingRole) {
        verdict = (parsed?.verdict as string) ?? null;
        issues = (parsed?.issues as unknown[]) ?? null;
      }
    } catch {
      const errorMsg = `Model returned invalid JSON for ${isGatingRole ? "gating" : "enricher"} step`;
      console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} failed: ${errorMsg}`);
      const action = await handleStepFailure(step, job, errorMsg);
      return { jobId: job.id, step: step.stepOrder, status: action };
    }
  }

  // Save step result
  await db
    .update(pipelineStep)
    .set({
      status: "completed",
      output: parsed ?? { content: response.content },
      verdict,
      issues: issues as typeof pipelineStep.$inferSelect.issues,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costUsd: costUsd.toFixed(6),
      completedAt: new Date(),
      durationMs,
    })
    .where(eq(pipelineStep.id, step.id));

  console.log(
    `[ai-pipeline] Job ${job.id} step ${step.stepOrder} completed — ` +
    `${response.inputTokens}+${response.outputTokens} tokens, $${costUsd.toFixed(6)}`
  );

  // Update job totals
  await db
    .update(pipelineJob)
    .set({
      currentStep: step.stepOrder,
      totalInputTokens: sql`${pipelineJob.totalInputTokens} + ${response.inputTokens}`,
      totalOutputTokens: sql`${pipelineJob.totalOutputTokens} + ${response.outputTokens}`,
      totalCostUsd: sql`${pipelineJob.totalCostUsd} + ${costUsd.toFixed(6)}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, job.id));

  // Check verdict for gating roles
  if (isGatingRole && verdict === "rejected") {
    const rejectionReason = Array.isArray(issues)
      ? issues.map((i: any) => i.description ?? i).join("; ")
      : "No details";

    await db
      .update(pipelineJob)
      .set({
        status: "failed",
        errorMessage: `Rejected by ${role} (${step.modelSlug}): ${rejectionReason}`,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pipelineJob.id, job.id));

    // Propagate rejection to linked contributions
    await propagateToContributions(job.contributionIds as number[], {
      status: "rejected",
      rejectionSource: "ai",
      rejectionReason: `Rejected by ${role}: ${rejectionReason}`,
    });

    return { jobId: job.id, step: step.stepOrder, status: "rejected" };
  }

  // Check if all steps are done
  const completionStatus = await checkJobCompletion(step, job);
  return { jobId: job.id, step: step.stepOrder, status: completionStatus };
}

// ---------------------------------------------------------------------------
// processNextStep — main entry point called by cron
// ---------------------------------------------------------------------------

export async function processNextStep(): Promise<{
  jobId: string;
  step: number;
  status: string;
} | null> {
  // 1. Find the oldest non-terminal job
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(not(inArray(pipelineJob.status, TERMINAL_STATUSES)))
    .orderBy(asc(pipelineJob.createdAt))
    .limit(1);

  if (!job) return null;

  // ── 2. BATCH POLLING — check any batch-submitted steps first ─────────────
  // This is the key architectural change: poll batch results (1-2s each)
  // instead of waiting 100-270s for synchronous API calls.
  const batchRunningSteps = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "running"),
        sql`${pipelineStep.batchJobId} IS NOT NULL`
      )
    );

  for (const batchStep of batchRunningSteps) {
    const batchResult = await checkBatch(
      batchStep.modelSlug as ModelSlug,
      batchStep.batchJobId!
    );

    if (batchResult.status === "completed" && batchResult.response) {
      // Batch finished — process the result (same path as real-time completion)
      console.log(
        `[ai-pipeline] Job ${job.id} step ${batchStep.stepOrder} (${batchStep.modelSlug}) batch completed — processing result`
      );

      // Load model config for cost calculation
      const [modelRow] = await db
        .select()
        .from(aiModelConfig)
        .where(eq(aiModelConfig.slug, batchStep.modelSlug))
        .limit(1);

      if (!modelRow) {
        const action = await handleStepFailure(batchStep, job, `Model config not found: ${batchStep.modelSlug}`);
        return { jobId: job.id, step: batchStep.stepOrder, status: action };
      }

      const config = toModelConfig(modelRow);
      return processCompletionResponse(
        batchStep,
        job,
        batchResult.response,
        config,
        batchStep.startedAt?.getTime() ?? Date.now()
      );
    }

    if (batchResult.status === "failed") {
      console.log(
        `[ai-pipeline] Job ${job.id} step ${batchStep.stepOrder} (${batchStep.modelSlug}) batch FAILED: ${batchResult.error}`
      );
      const action = await handleStepFailure(
        batchStep,
        job,
        batchResult.error || "Batch job failed"
      );
      return { jobId: job.id, step: batchStep.stepOrder, status: action };
    }

    // Still processing — this step blocks the pipeline (sequential council)
    // Return early so the cron can check generation batches or exit.
    if (batchStep.stepOrder < 100) {
      console.log(
        `[ai-pipeline] Job ${job.id} step ${batchStep.stepOrder} (${batchStep.modelSlug}) batch still processing`
      );
      return { jobId: job.id, step: batchStep.stepOrder, status: "batch_processing" };
    }
  }

  // ── 3. STALE RECOVERY — only for real-time steps (no batchJobId) ─────────
  // Batch steps can legitimately run for up to 24h. Only reset steps that
  // are stuck from a crashed real-time API call.
  const staleThresholdISO = new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS).toISOString();
  const staleSteps = await db
    .select({
      id: pipelineStep.id,
      stepOrder: pipelineStep.stepOrder,
      modelSlug: pipelineStep.modelSlug,
      retryCount: pipelineStep.retryCount,
    })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "running"),
        sql`${pipelineStep.batchJobId} IS NULL`,
        sql`${pipelineStep.startedAt} IS NOT NULL AND ${pipelineStep.startedAt} < ${staleThresholdISO}::timestamp`
      )
    );

  for (const stale of staleSteps) {
    console.log(
      `[ai-pipeline] Recovering stale step ${stale.stepOrder} (${stale.modelSlug}) — stuck running > ${STALE_RUNNING_THRESHOLD_MS / 1000}s`
    );
    await db
      .update(pipelineStep)
      .set({
        status: "pending",
        retryCount: stale.retryCount + 1,
        errorMessage: `Recovered from stale running state (function likely crashed/timed out)`,
        startedAt: null,
      })
      .where(eq(pipelineStep.id, stale.id));
  }

  // ── 4. SEQUENTIAL CHECK — any council step in progress? ──────────────────
  // Council steps (< 100) run one at a time. This includes both real-time
  // (running, no batchJobId) and batch (running, has batchJobId) steps.
  const [runningCouncil] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "running"),
        sql`${pipelineStep.stepOrder} < 100`
      )
    );

  if (Number(runningCouncil.count) > 0) {
    // A council step is still running (real-time or batch) — wait
    return null;
  }

  // ── 5. FIND NEXT PENDING STEP ────────────────────────────────────────────
  const [step] = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "pending")
      )
    )
    .orderBy(asc(pipelineStep.stepOrder))
    .limit(1);

  if (!step) {
    // No pending steps left — check completion
    // (might be waiting for batch steps, or truly done)
    const [anyNonTerminal] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pipelineStep)
      .where(
        and(
          eq(pipelineStep.jobId, job.id),
          inArray(pipelineStep.status, ["pending", "running"])
        )
      );

    if (Number(anyNonTerminal.count) === 0) {
      await db
        .update(pipelineJob)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pipelineJob.id, job.id));
      return { jobId: job.id, step: job.currentStep, status: "completed" };
    }

    return null;
  }

  // ── 6. LOAD MODEL CONFIG ─────────────────────────────────────────────────
  const [modelRow] = await db
    .select()
    .from(aiModelConfig)
    .where(
      and(
        eq(aiModelConfig.slug, step.modelSlug),
        eq(aiModelConfig.enabled, true)
      )
    )
    .limit(1);

  if (!modelRow) {
    const stepRole = step.role as ModelRole;
    const msg = `Model config not found or disabled: ${step.modelSlug}`;
    if (SKIPPABLE_ROLES.includes(stepRole)) {
      await skipStep(step.id, job.id, msg);
      return { jobId: job.id, step: step.stepOrder, status: "skipped" };
    }
    await failStep(step.id, job.id, msg);
    return { jobId: job.id, step: step.stepOrder, status: "failed" };
  }

  const config = toModelConfig(modelRow);
  const role = step.role as ModelRole;

  // ── 7. OPTIMISTIC LOCK — claim the step ──────────────────────────────────
  const lockResult = await db
    .update(pipelineStep)
    .set({ status: "running", startedAt: new Date() })
    .where(
      and(
        eq(pipelineStep.id, step.id),
        eq(pipelineStep.status, "pending")
      )
    )
    .returning({ id: pipelineStep.id });

  if (lockResult.length === 0) {
    return null; // Another invocation grabbed it
  }

  // Update job status
  const jobStatus = ROLE_TO_JOB_STATUS[role] ?? "extracting";
  await db
    .update(pipelineJob)
    .set({
      status: jobStatus,
      currentStep: step.stepOrder,
      startedAt: job.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, job.id));

  // ── 8a. GENERATOR STEPS — delegate to publisher (real-time) ──────────────
  if (role === "generator") {
    const genStartTime = Date.now();
    console.log(`[ai-pipeline] Job ${job.id} gen step ${step.stepOrder} (${step.modelSlug}) started`);

    try {
      const genResult = await Promise.race([
        processGenerationStep(step, job, {
          slug: config.slug,
          modelId: config.modelId,
          maxOutputTokens: config.maxOutputTokens,
          costPerInputToken: config.costPerInputToken,
          costPerOutputToken: config.costPerOutputToken,
          config: config.config,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Generator timed out after ${AI_CALL_TIMEOUT_MS}ms`)),
            AI_CALL_TIMEOUT_MS
          )
        ),
      ]);

      const durationMs = Date.now() - genStartTime;

      await db
        .update(pipelineStep)
        .set({
          status: "completed",
          output: { generated: true, contentType: step.inputSummary?.replace("generate:", "") },
          inputTokens: genResult.inputTokens,
          outputTokens: genResult.outputTokens,
          costUsd: genResult.costUsd.toFixed(6),
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(pipelineStep.id, step.id));

      console.log(
        `[ai-pipeline] Job ${job.id} gen step ${step.stepOrder} completed — ` +
        `${genResult.inputTokens}+${genResult.outputTokens} tokens, $${genResult.costUsd.toFixed(6)}`
      );

      await db
        .update(pipelineJob)
        .set({
          currentStep: step.stepOrder,
          totalInputTokens: sql`${pipelineJob.totalInputTokens} + ${genResult.inputTokens}`,
          totalOutputTokens: sql`${pipelineJob.totalOutputTokens} + ${genResult.outputTokens}`,
          totalCostUsd: sql`${pipelineJob.totalCostUsd} + ${genResult.costUsd.toFixed(6)}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(pipelineJob.id, job.id));

      const completionStatus = await checkJobCompletion(step, job);
      return { jobId: job.id, step: step.stepOrder, status: completionStatus };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`[ai-pipeline] Job ${job.id} gen step ${step.stepOrder} failed: ${errorMsg}`);
      const action = await handleStepFailure(step, job, errorMsg);
      return { jobId: job.id, step: step.stepOrder, status: action };
    }
  }

  // ── 8b. GATHER CONTEXT — same for batch and real-time ────────────────────
  const previousSteps = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "completed")
      )
    )
    .orderBy(asc(pipelineStep.stepOrder));

  const sourceContent = previousSteps.length > 0
    ? (previousSteps[0].inputSummary ?? "")
    : (step.inputSummary ?? "");

  const previousOutputs = previousSteps.map((s) => ({
    role: s.role as ModelRole,
    modelSlug: s.modelSlug as ModelSlug,
    output: s.output,
  }));

  const contentTypes = job.outputTypes as string[];
  const contentType = contentTypes[0] as import("./types").ContentType;

  const previousOutputStrings = previousOutputs.map((o) => ({
    role: o.role as string,
    output: (() => {
      const out = o.output as Record<string, unknown> | null;
      if (out && "enrichedContent" in out) {
        return JSON.stringify(out.enrichedContent);
      }
      if (out && "content" in out) {
        return out.content as string;
      }
      return typeof out === "string" ? out : JSON.stringify(out);
    })(),
  }));

  console.log(
    `[ai-pipeline] Job ${job.id} step ${step.stepOrder} context: ` +
    `sourceContent=${sourceContent.length} chars, ` +
    `previousOutputs=${previousOutputStrings.length} entries: ` +
    `${previousOutputStrings.map(o => `${o.role}=${o.output.length}chars`).join(", ")}`
  );

  // Fetch course context for content validation (creator step only)
  let courseContext: CourseContext | undefined;
  if (role === "creator") {
    try {
      const [courseRow] = await db
        .select({
          title: course.title,
          facultyId: course.facultyId,
        })
        .from(course)
        .where(eq(course.id, job.courseId))
        .limit(1);

      if (courseRow) {
        courseContext = { courseName: courseRow.title };

        if (courseRow.facultyId) {
          const [facultyRow] = await db
            .select({ name: faculty.name, university: faculty.university })
            .from(faculty)
            .where(eq(faculty.id, courseRow.facultyId))
            .limit(1);

          if (facultyRow) {
            courseContext.facultyName = facultyRow.name;
            courseContext.universityName = facultyRow.university;
          }
        }
      }
    } catch (e) {
      console.log(`[ai-pipeline] Failed to fetch course context: ${(e as Error).message}`);
    }
  }

  const prompt = await getPrompt(role, contentType, sourceContent, previousOutputStrings, courseContext, job.sourceLanguage);
  const messages: AIMessage[] = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  const isJsonRole = JSON_ROLES.includes(role);
  const startTime = Date.now();

  // ── 8c. BATCH SUBMISSION — for batch-capable models (admin-toggleable) ───
  // Check both: model supports batch API AND admin has explicitly enabled it.
  // Defaults to real-time (useBatch must be explicitly set to true from admin).
  const useBatch = supportsBatch(config.slug) && (config.config?.useBatch === true);
  if (useBatch) {
    console.log(
      `[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) — submitting batch`
    );

    try {
      const batchJobId = await submitBatch(
        config.slug,
        {
          model: config.slug,
          modelId: config.modelId,
          messages,
          temperature: (config.config?.temperature as number | undefined) ?? 0.4,
          maxTokens: config.maxOutputTokens,
          responseFormat: isJsonRole ? "json" : "text",
        },
        step.id.toString()
      );

      // Save batch job ID on the step — next cron invocation will poll it
      await db
        .update(pipelineStep)
        .set({ batchJobId })
        .where(eq(pipelineStep.id, step.id));

      console.log(
        `[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) — batch submitted: ${batchJobId}`
      );

      return { jobId: job.id, step: step.stepOrder, status: "batch_submitted" };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Batch submission failed";
      console.log(
        `[ai-pipeline] Job ${job.id} step ${step.stepOrder} batch submit failed: ${errorMsg}`
      );
      const action = await handleStepFailure(step, job, errorMsg);
      return { jobId: job.id, step: step.stepOrder, status: action };
    }
  }

  // ── 8d. REAL-TIME CALL — for Kimi (no batch) or admin-toggled real-time ──
  console.log(
    `[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) — real-time call`
  );

  try {
    const response = await Promise.race([
      complete({
        model: config.slug,
        modelId: config.modelId,
        messages,
        temperature: (config.config?.temperature as number | undefined) ?? 0.4,
        maxTokens: config.maxOutputTokens,
        responseFormat: isJsonRole ? "json" : "text",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS}ms`)),
          AI_CALL_TIMEOUT_MS
        )
      ),
    ]);

    return processCompletionResponse(step, job, response, config, startTime);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} failed: ${errorMsg}`);
    const action = await handleStepFailure(step, job, errorMsg);
    return { jobId: job.id, step: step.stepOrder, status: action };
  }
}

// ---------------------------------------------------------------------------
// processGenerationBatch — run generation steps in parallel for one content type
// ---------------------------------------------------------------------------

export async function processGenerationBatch(): Promise<{
  jobId: string;
  contentType: string;
  results: Array<{ step: number; model: string; status: string }>;
} | null> {
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(not(inArray(pipelineJob.status, TERMINAL_STATUSES)))
    .orderBy(asc(pipelineJob.createdAt))
    .limit(1);

  if (!job) return null;

  const pendingGenSteps = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "pending"),
        sql`${pipelineStep.stepOrder} >= 100`
      )
    )
    .orderBy(asc(pipelineStep.stepOrder));

  if (pendingGenSteps.length === 0) return null;

  const firstType = (pendingGenSteps[0].inputSummary ?? "").replace("generate:", "");
  const batch = pendingGenSteps.filter(
    (s) => (s.inputSummary ?? "").replace("generate:", "") === firstType
  );

  console.log(
    `[ai-pipeline] Job ${job.id} generation batch: ${firstType} — ${batch.length} models in parallel`
  );

  const results = await Promise.allSettled(
    batch.map(async (step) => {
      const lockResult = await db
        .update(pipelineStep)
        .set({ status: "running", startedAt: new Date() })
        .where(
          and(
            eq(pipelineStep.id, step.id),
            eq(pipelineStep.status, "pending")
          )
        )
        .returning({ id: pipelineStep.id });

      if (lockResult.length === 0) {
        return { step: step.stepOrder, model: step.modelSlug, status: "already_taken" };
      }

      const [modelRow] = await db
        .select()
        .from(aiModelConfig)
        .where(
          and(
            eq(aiModelConfig.slug, step.modelSlug),
            eq(aiModelConfig.enabled, true)
          )
        )
        .limit(1);

      if (!modelRow) {
        await db.update(pipelineStep).set({
          status: "skipped",
          errorMessage: `Model config not found: ${step.modelSlug}`,
          completedAt: new Date(),
        }).where(eq(pipelineStep.id, step.id));
        return { step: step.stepOrder, model: step.modelSlug, status: "skipped" };
      }

      const config = toModelConfig(modelRow);
      const genStartTime = Date.now();

      try {
        const genResult = await Promise.race([
          processGenerationStep(step, job, {
            slug: config.slug,
            modelId: config.modelId,
            maxOutputTokens: config.maxOutputTokens,
            costPerInputToken: config.costPerInputToken,
            costPerOutputToken: config.costPerOutputToken,
            config: config.config,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Generator timed out after ${AI_CALL_TIMEOUT_MS}ms`)),
              AI_CALL_TIMEOUT_MS
            )
          ),
        ]);

        const durationMs = Date.now() - genStartTime;

        await db.update(pipelineStep).set({
          status: "completed",
          output: { generated: true, contentType: firstType },
          inputTokens: genResult.inputTokens,
          outputTokens: genResult.outputTokens,
          costUsd: genResult.costUsd.toFixed(6),
          completedAt: new Date(),
          durationMs,
        }).where(eq(pipelineStep.id, step.id));

        await db.update(pipelineJob).set({
          totalInputTokens: sql`${pipelineJob.totalInputTokens} + ${genResult.inputTokens}`,
          totalOutputTokens: sql`${pipelineJob.totalOutputTokens} + ${genResult.outputTokens}`,
          totalCostUsd: sql`${pipelineJob.totalCostUsd} + ${genResult.costUsd}`,
          currentStep: step.stepOrder,
          updatedAt: new Date(),
        }).where(eq(pipelineJob.id, job.id));

        console.log(
          `[ai-pipeline] Job ${job.id} gen ${firstType}/${step.modelSlug} done — ` +
          `${genResult.inputTokens}+${genResult.outputTokens} tokens, $${genResult.costUsd.toFixed(6)}`
        );

        return { step: step.stepOrder, model: step.modelSlug, status: "completed" };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.log(`[ai-pipeline] Job ${job.id} gen ${firstType}/${step.modelSlug} failed: ${errorMsg}`);
        const action = await handleStepFailure(step, job, errorMsg);
        return { step: step.stepOrder, model: step.modelSlug, status: action };
      }
    })
  );

  const processedResults = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { step: batch[i].stepOrder, model: batch[i].modelSlug, status: "error" }
  );

  const lastStep = batch[batch.length - 1];
  await checkJobCompletion(lastStep, job);

  return {
    jobId: job.id,
    contentType: firstType,
    results: processedResults,
  };
}

// ---------------------------------------------------------------------------
// Job completion check
// ---------------------------------------------------------------------------

async function checkJobCompletion(
  step: typeof pipelineStep.$inferSelect,
  job: typeof pipelineJob.$inferSelect,
): Promise<string> {
  const [remaining] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        inArray(pipelineStep.status, ["pending", "running"])
      )
    );

  if (Number(remaining.count) > 0) {
    return "step_completed";
  }

  const isTeacherStep = step.stepOrder < 100;

  const [existingGenSteps] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.role, "generator")
      )
    );
  const hasGenSteps = Number(existingGenSteps.count) > 0;

  if (isTeacherStep && !hasGenSteps) {
    const genCount = await createGenerationSteps(job.id);
    if (genCount > 0) {
      console.log(
        `[ai-pipeline] Job ${job.id} teacher phase complete — ${genCount} generation steps queued`
      );
      return "generating";
    }

    const [recheck] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pipelineStep)
      .where(
        and(
          eq(pipelineStep.jobId, job.id),
          inArray(pipelineStep.status, ["pending", "running"])
        )
      );
    if (Number(recheck.count) > 0) {
      return "step_completed";
    }
  }

  await db
    .update(pipelineJob)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, job.id));

  const [updatedJob] = await db
    .select({ totalCostUsd: pipelineJob.totalCostUsd })
    .from(pipelineJob)
    .where(eq(pipelineJob.id, job.id))
    .limit(1);
  console.log(
    `[ai-pipeline] Job ${job.id} completed — total $${updatedJob?.totalCostUsd ?? "unknown"}`
  );

  // Propagate approval to linked contributions + notify subscribers
  await propagateToContributions(job.contributionIds as number[], {
    status: "approved",
  });

  try {
    const { dispatchNotification } = await import("@/lib/notification-dispatch");
    const { getSubscriberIds } = await import("@/lib/subscriptions");
    const subscriberIds = await getSubscriberIds("course", job.courseId);
    for (const subUserId of subscriberIds) {
      await dispatchNotification(subUserId, {
        category: "course_update",
        title: "New Content Available",
        body: "New study content has been published for a course you follow.",
        url: `/dashboard/courses`,
        metadata: { courseId: job.courseId, jobId: job.id },
      });
    }
  } catch (subErr) {
    console.log(`[ai-pipeline] Failed to notify subscribers: ${(subErr as Error).message}`);
  }

  return "completed";
}

// ---------------------------------------------------------------------------
// Step failure handling with retry logic
// ---------------------------------------------------------------------------

async function handleStepFailure(
  step: typeof pipelineStep.$inferSelect,
  job: typeof pipelineJob.$inferSelect,
  errorMessage: string
): Promise<"retrying" | "skipped" | "failed"> {
  const role = step.role as ModelRole;
  const isSkippable = SKIPPABLE_ROLES.includes(role);

  // ── Billing/credit alert — email admin immediately ────────────────────
  try {
    const { checkAndAlertBilling } = await import("@/lib/admin-alerts");
    await checkAndAlertBilling(step.modelSlug ?? "unknown", errorMessage, {
      jobId: job.id,
      courseId: job.courseId,
      step: `${step.stepOrder} (${role})`,
    });
  } catch { /* alert is best-effort */ }

  if (isPermanentError(errorMessage)) {
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) PERMANENT ERROR: ${errorMessage}`);
    if (isSkippable) {
      await skipStep(step.id, job.id, `PERMANENT: ${errorMessage}`);
      return "skipped";
    }
    await failStep(step.id, job.id, `PERMANENT: ${errorMessage}`);
    return "failed";
  }

  const newRetryCount = step.retryCount + 1;

  if (newRetryCount >= job.maxRetries) {
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) exhausted ${job.maxRetries} retries`);
    if (isSkippable) {
      await skipStep(step.id, job.id, `${job.maxRetries} retries exhausted: ${errorMessage}`);
      return "skipped";
    }
    await failStep(step.id, job.id, `${job.maxRetries} retries exhausted: ${errorMessage}`);
    return "failed";
  }

  console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) RETRYING ${newRetryCount}/${job.maxRetries}: ${errorMessage}`);
  await db
    .update(pipelineStep)
    .set({
      status: "pending",
      retryCount: newRetryCount,
      errorMessage,
      startedAt: null,
      batchJobId: null, // Clear batch ID so retry resubmits
    })
    .where(eq(pipelineStep.id, step.id));

  return "retrying";
}

async function skipStep(stepId: number, jobId: string, errorMessage: string) {
  await db
    .update(pipelineStep)
    .set({
      status: "skipped",
      errorMessage: `SKIPPED: ${errorMessage}`,
      completedAt: new Date(),
      batchJobId: null,
    })
    .where(eq(pipelineStep.id, stepId));

  console.log(`[ai-pipeline] Job ${jobId} step ${stepId} SKIPPED — ${errorMessage}`);
}

async function failStep(stepId: number, jobId: string, errorMessage: string) {
  await db
    .update(pipelineStep)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
      batchJobId: null,
    })
    .where(eq(pipelineStep.id, stepId));

  await db
    .update(pipelineJob)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, jobId));
}

// ---------------------------------------------------------------------------
// createJob — creates a new pipeline job + pre-creates all step rows
// ---------------------------------------------------------------------------

export async function createJob(params: {
  courseId: string;
  contributionIds: number[];
  outputTypes: string[];
  startedBy: string;
  sourceContent: string;
  sourceLanguage?: string;
}): Promise<string> {
  // Validate contribution IDs exist before creating job
  if (params.contributionIds.length === 0) {
    throw new Error("At least one contribution ID is required");
  }

  const existingContribs = await db
    .select({ id: contribution.id })
    .from(contribution)
    .where(inArray(contribution.id, params.contributionIds));

  const existingIds = new Set(existingContribs.map((c) => c.id));
  const missingIds = params.contributionIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(
      `Contribution ID(s) not found: ${missingIds.join(", ")}. Cannot create pipeline job with invalid references.`
    );
  }

  const models = await db
    .select()
    .from(aiModelConfig)
    .where(eq(aiModelConfig.enabled, true))
    .orderBy(asc(aiModelConfig.pipelineOrder));

  if (models.length === 0) {
    throw new Error("No enabled AI models configured");
  }

  const [job] = await db
    .insert(pipelineJob)
    .values({
      courseId: params.courseId,
      contributionIds: params.contributionIds,
      status: "pending",
      currentStep: 0,
      outputTypes: params.outputTypes,
      sourceLanguage: params.sourceLanguage ?? null,
      startedBy: params.startedBy,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: "0",
    })
    .returning({ id: pipelineJob.id });

  const stepRows = models.map((model, idx) => ({
    jobId: job.id,
    modelSlug: model.slug,
    role: model.role,
    stepOrder: model.pipelineOrder,
    status: "pending",
    inputTokens: 0,
    outputTokens: 0,
    costUsd: "0",
    retryCount: 0,
    inputSummary: idx === 0 ? params.sourceContent : null,
  }));

  await db.insert(pipelineStep).values(stepRows);

  return job.id;
}

// ---------------------------------------------------------------------------
// getJobStatus
// ---------------------------------------------------------------------------

export async function getJobStatus(jobId: string) {
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(eq(pipelineJob.id, jobId))
    .limit(1);

  if (!job) return null;

  const steps = await db
    .select()
    .from(pipelineStep)
    .where(eq(pipelineStep.jobId, jobId))
    .orderBy(asc(pipelineStep.stepOrder));

  return { ...job, steps };
}

// ---------------------------------------------------------------------------
// cancelJob — cancels active batch jobs + marks job cancelled
// ---------------------------------------------------------------------------

export async function cancelJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(eq(pipelineJob.id, jobId))
    .limit(1);

  if (!job || TERMINAL_STATUSES.includes(job.status as PipelineStatus)) {
    return false;
  }

  // Cancel any active batch jobs (best effort)
  const activeBatchSteps = await db
    .select({
      id: pipelineStep.id,
      modelSlug: pipelineStep.modelSlug,
      batchJobId: pipelineStep.batchJobId,
    })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        eq(pipelineStep.status, "running"),
        sql`${pipelineStep.batchJobId} IS NOT NULL`
      )
    );

  for (const batchStep of activeBatchSteps) {
    await cancelBatch(batchStep.modelSlug as ModelSlug, batchStep.batchJobId!);
  }

  // Skip all pending + running steps
  await db
    .update(pipelineStep)
    .set({ status: "skipped", batchJobId: null })
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        inArray(pipelineStep.status, ["pending", "running"])
      )
    );

  await db
    .update(pipelineJob)
    .set({
      status: "cancelled",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, jobId));

  return true;
}

// ---------------------------------------------------------------------------
// retryJob — resets the failed step (clears batch ID) and retries
// ---------------------------------------------------------------------------

export async function retryJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(eq(pipelineJob.id, jobId))
    .limit(1);

  if (!job || job.status !== "failed") {
    return false;
  }

  if (job.retryCount >= job.maxRetries) {
    return false;
  }

  const [failedStep] = await db
    .select()
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        eq(pipelineStep.status, "failed")
      )
    )
    .orderBy(asc(pipelineStep.stepOrder))
    .limit(1);

  if (!failedStep) return false;

  // Reset the failed step — clear batchJobId so retry resubmits
  await db
    .update(pipelineStep)
    .set({
      status: "pending",
      retryCount: 0,
      errorMessage: null,
      output: null,
      verdict: null,
      issues: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: "0",
      batchJobId: null,
    })
    .where(eq(pipelineStep.id, failedStep.id));

  // Reset skipped steps after the failed one
  await db
    .update(pipelineStep)
    .set({ status: "pending", batchJobId: null })
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        eq(pipelineStep.status, "skipped")
      )
    );

  await db
    .update(pipelineJob)
    .set({
      status: "pending",
      errorMessage: null,
      completedAt: null,
      retryCount: sql`${pipelineJob.retryCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJob.id, jobId));

  return true;
}
