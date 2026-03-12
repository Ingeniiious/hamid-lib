// ---------------------------------------------------------------------------
// AI Teachers' Council -- Pipeline Orchestrator
//
// Cron-driven state machine. Each invocation processes ONE step of ONE job,
// keeping execution well under Vercel's 60 s function limit.
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import {
  aiModelConfig,
  pipelineJob,
  pipelineStep,
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
import { getPrompt } from "@/lib/ai/prompts";
import { createGenerationSteps, processGenerationStep } from "@/lib/ai/publisher";
import type {
  ModelSlug,
  ModelRole,
  PipelineStatus,
  ModelConfig,
  AIMessage,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES: PipelineStatus[] = ["completed", "failed", "cancelled"];

/** Timeout for AI calls (45s to leave margin for DB writes within 60s Vercel limit). */
const AI_CALL_TIMEOUT_MS = 45_000;

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

/** Roles that can be skipped on failure without killing the job.
 *  Creator is the ONLY non-skippable role — without initial content, there's nothing to review. */
const SKIPPABLE_ROLES: ModelRole[] = ["reviewer", "enricher", "validator", "fact_checker", "generator"];

/** Error patterns that indicate a permanent failure — no point retrying. */
const PERMANENT_ERROR_PATTERNS = [
  "api key",
  "apikey",
  "unauthorized",
  "forbidden",
  "invalid.*key",
  "authentication",
  "not set",       // "OPENAI_API_KEY is not set"
  "permission",
];

/** Check if an error is permanent (won't resolve on retry). */
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

  // 2. Find the next pending step for this job (order by stepOrder)
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
    // No pending steps left — job is done, transition to completed
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

  // 3. Load model config for this step
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

  // 4. Optimistic lock — claim the step (only if still pending)
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
    // Another invocation grabbed it — nothing to do
    return null;
  }

  // Update job status to reflect current phase
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

  // ── Generator steps — delegate to publisher ────────────────────────────
  if (role === "generator") {
    const genStartTime = Date.now();
    console.log(`[ai-pipeline] Job ${job.id} gen step ${step.stepOrder} (${step.modelSlug}) started`);

    try {
      const genResult = await Promise.race([
        processGenerationStep(step, job, {
          slug: config.slug,
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

      // Save step result
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

      // Update job totals
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

      // Check completion
      const completionStatus = await checkJobCompletion(step, job);
      return { jobId: job.id, step: step.stepOrder, status: completionStatus };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`[ai-pipeline] Job ${job.id} gen step ${step.stepOrder} failed: ${errorMsg}`);
      const action = await handleStepFailure(step, job, errorMsg);
      return { jobId: job.id, step: step.stepOrder, status: action };
    }
  }

  // 5. Gather context: source content + all previous completed step outputs
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

  // The source content is stored in the first step's inputSummary
  const sourceContent = previousSteps.length > 0
    ? (previousSteps[0].inputSummary ?? "")
    : (step.inputSummary ?? "");

  const previousOutputs = previousSteps.map((s) => ({
    role: s.role as ModelRole,
    modelSlug: s.modelSlug as ModelSlug,
    output: s.output,
  }));

  // 6. Build prompt and call the AI
  // Pipeline generates one content type at a time — use the first requested type.
  // (Multi-type jobs create separate jobs or iterate; the orchestrator handles one.)
  const contentTypes = job.outputTypes as string[];
  const contentType = contentTypes[0] as import("./types").ContentType;

  // FIX 1: Extract actual content from previous outputs — for gating roles,
  // prefer enrichedContent over the full verdict JSON wrapper
  const previousOutputStrings = previousOutputs.map((o) => ({
    role: o.role as string,
    output: (() => {
      const out = o.output as Record<string, unknown> | null;
      // For gating roles, prefer enrichedContent over the full verdict JSON
      if (out && "enrichedContent" in out) {
        return JSON.stringify(out.enrichedContent);
      }
      if (out && "content" in out) {
        return out.content as string;
      }
      return typeof out === "string" ? out : JSON.stringify(out);
    })(),
  }));

  const prompt = getPrompt(role, contentType, sourceContent, previousOutputStrings);
  const messages: AIMessage[] = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  const isGatingRole = GATING_ROLES.includes(role);
  const isJsonRole = JSON_ROLES.includes(role);
  const startTime = Date.now();

  // FIX 5: Log step start
  console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) started`);

  try {
    // FIX 6: Wrap AI call in timeout (45s to leave margin for DB writes)
    const response = await Promise.race([
      complete({
        model: config.slug,
        messages,
        temperature: (config.config?.temperature as number | undefined) ?? 0.4,
        maxTokens: config.maxOutputTokens,
        responseFormat: isJsonRole ? "json" : "text",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS}ms`)), AI_CALL_TIMEOUT_MS)
      ),
    ]);

    const durationMs = Date.now() - startTime;
    const costUsd = calculateStepCost(response.inputTokens, response.outputTokens, config);

    // Check for truncated output — each provider uses different finish_reason values:
    // OpenAI/Kimi/Grok: "length", Anthropic: "max_tokens" or "model_context_window_exceeded", Gemini: "MAX_TOKENS"
    const TRUNCATION_REASONS = ["length", "max_tokens", "MAX_TOKENS", "model_context_window_exceeded"];
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

    // FIX 2: Parse JSON for all JSON_ROLES (gating + enricher)
    if (isJsonRole) {
      try {
        parsed = JSON.parse(response.content);
        // Only extract verdict/issues for gating roles
        if (isGatingRole) {
          verdict = (parsed?.verdict as string) ?? null;
          issues = (parsed?.issues as unknown[]) ?? null;
        }
      } catch {
        // Model returned invalid JSON for a JSON role — treat as failure
        const errorMsg = `Model returned invalid JSON for ${isGatingRole ? "gating" : "enricher"} step`;
        console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} failed: ${errorMsg}`);
        const action = await handleStepFailure(step, job, errorMsg);
        return { jobId: job.id, step: step.stepOrder, status: action };
      }
    }

    // 7. Save step result
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

    // FIX 5: Log step completion
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} completed — ${response.inputTokens}+${response.outputTokens} tokens, $${costUsd.toFixed(6)}`);

    // 8. Update job totals
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

    // 9. Check verdict for gating roles
    if (isGatingRole && verdict === "rejected") {
      await db
        .update(pipelineJob)
        .set({
          status: "failed",
          errorMessage: `Rejected by ${role} (${step.modelSlug}): ${
            Array.isArray(issues) ? issues.map((i: any) => i.description ?? i).join("; ") : "No details"
          }`,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pipelineJob.id, job.id));

      return { jobId: job.id, step: step.stepOrder, status: "rejected" };
    }

    // 10. Check if all steps are done (teacher → generation transition, or final completion)
    const completionStatus = await checkJobCompletion(step, job);
    return { jobId: job.id, step: step.stepOrder, status: completionStatus };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} failed: ${errorMsg}`);
    const action = await handleStepFailure(step, job, errorMsg);
    return { jobId: job.id, step: step.stepOrder, status: action };
  }
}

// ---------------------------------------------------------------------------
// Job completion check — shared by teacher and generator paths
// ---------------------------------------------------------------------------

/**
 * After a step completes, check if the job should transition:
 * - Teacher steps done (stepOrder < 100) → create generation steps
 * - Generation steps done (stepOrder ≥ 100) → mark job completed
 * - Steps still pending → return "step_completed"
 */
async function checkJobCompletion(
  step: typeof pipelineStep.$inferSelect,
  job: typeof pipelineJob.$inferSelect,
): Promise<string> {
  // Count remaining pending/running steps
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

  // All current steps done — check which phase just completed
  // Teacher steps have stepOrder < 100, generator steps start at 100+
  if (step.stepOrder < 100) {
    // Teacher phase done — create generation steps
    const genCount = await createGenerationSteps(job.id);
    if (genCount > 0) {
      console.log(
        `[ai-pipeline] Job ${job.id} teacher phase complete — ${genCount} generation steps queued`
      );
      return "generating";
    }

    // genCount === 0 could mean another invocation already created them (race condition)
    // Re-check to be safe
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

  // All done — mark completed
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

  // ── Permanent errors: don't waste retries ──────────────────────────────
  // Auth errors, missing API keys, etc. won't resolve on retry.
  if (isPermanentError(errorMessage)) {
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) PERMANENT ERROR: ${errorMessage}`);
    if (isSkippable) {
      await skipStep(step.id, job.id, `PERMANENT: ${errorMessage}`);
      return "skipped";
    }
    await failStep(step.id, job.id, `PERMANENT: ${errorMessage}`);
    return "failed";
  }

  // ── Transient errors: retry with backoff ───────────────────────────────
  const newRetryCount = step.retryCount + 1;

  if (newRetryCount >= job.maxRetries) {
    // Max retries exhausted — skip if possible, fail if not
    console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) exhausted ${job.maxRetries} retries`);
    if (isSkippable) {
      await skipStep(step.id, job.id, `${job.maxRetries} retries exhausted: ${errorMessage}`);
      return "skipped";
    }
    await failStep(step.id, job.id, `${job.maxRetries} retries exhausted: ${errorMessage}`);
    return "failed";
  }

  // Reset to pending so the next cron invocation retries it
  console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} (${role}/${step.modelSlug}) RETRYING ${newRetryCount}/${job.maxRetries}: ${errorMessage}`);
  await db
    .update(pipelineStep)
    .set({
      status: "pending",
      retryCount: newRetryCount,
      errorMessage,
      startedAt: null,
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
    })
    .where(eq(pipelineStep.id, stepId));

  console.log(`[ai-pipeline] Job ${jobId} step ${stepId} SKIPPED — ${errorMessage}`);
  // Job stays alive — next cron invocation picks up the next pending step
}

async function failStep(stepId: number, jobId: string, errorMessage: string) {
  await db
    .update(pipelineStep)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
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
}): Promise<string> {
  // Fetch all enabled models, ordered by pipeline position
  const models = await db
    .select()
    .from(aiModelConfig)
    .where(eq(aiModelConfig.enabled, true))
    .orderBy(asc(aiModelConfig.pipelineOrder));

  if (models.length === 0) {
    throw new Error("No enabled AI models configured");
  }

  // Insert the job
  const [job] = await db
    .insert(pipelineJob)
    .values({
      courseId: params.courseId,
      contributionIds: params.contributionIds,
      status: "pending",
      currentStep: 0,
      outputTypes: params.outputTypes,
      startedBy: params.startedBy,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: "0",
    })
    .returning({ id: pipelineJob.id });

  // Pre-create a step row for each model in the pipeline
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
    // Store source content on the first step so the orchestrator can find it
    inputSummary: idx === 0 ? params.sourceContent : null,
  }));

  await db.insert(pipelineStep).values(stepRows);

  return job.id;
}

// ---------------------------------------------------------------------------
// getJobStatus — returns the job with all its steps
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
// cancelJob — marks a job as cancelled, skips remaining steps
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

  // Skip all pending steps
  await db
    .update(pipelineStep)
    .set({ status: "skipped" })
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        eq(pipelineStep.status, "pending")
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
// retryJob — resets the failed step and retries from that point
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

  // FIX 3: Check job.maxRetries before allowing retry
  if (job.retryCount >= job.maxRetries) {
    return false;
  }

  // Find the failed step
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

  // Reset the failed step to pending
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
    })
    .where(eq(pipelineStep.id, failedStep.id));

  // Reset any steps after the failed one that were skipped
  await db
    .update(pipelineStep)
    .set({ status: "pending" })
    .where(
      and(
        eq(pipelineStep.jobId, jobId),
        eq(pipelineStep.status, "skipped")
      )
    );

  // Reset job status to pending
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
