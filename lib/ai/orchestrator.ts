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

    // Dispatch notifications asynchronously (don't block pipeline)
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
            body: `Your contribution "${c.title}" has been approved and content is being generated.`,
            url: "/dashboard/contribute/my",
            metadata: { contributionId: contribId },
          });

          // Increment approved count in contributor stats
          await db
            .update(contributorStats)
            .set({
              approvedContributions: sql`${contributorStats.approvedContributions} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(contributorStats.userId, c.userId));
        }
      } catch (notifErr) {
        console.log(`[ai-pipeline] Failed to notify for contribution ${contribId}: ${(notifErr as Error).message}`);
      }
    }
  } catch (e) {
    console.log(`[ai-pipeline] Failed to propagate to contributions: ${(e as Error).message}`);
  }
}

const TERMINAL_STATUSES: PipelineStatus[] = ["completed", "failed", "cancelled"];

/** Timeout for individual AI calls (270s — Vercel Pro allows 300s maxDuration, 30s buffer for DB). */
const AI_CALL_TIMEOUT_MS = 270_000;

/** If a step has been "running" longer than this, assume it's stuck (Vercel function crashed). */
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

  // 2a. Detect and recover stale "running" steps — if Vercel killed the function,
  //     the step stays "running" forever. Reset any step running > 90s back to pending.
  const staleThresholdISO = new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS).toISOString();
  const staleSteps = await db
    .select({ id: pipelineStep.id, stepOrder: pipelineStep.stepOrder, modelSlug: pipelineStep.modelSlug, retryCount: pipelineStep.retryCount })
    .from(pipelineStep)
    .where(
      and(
        eq(pipelineStep.jobId, job.id),
        eq(pipelineStep.status, "running"),
        sql`${pipelineStep.startedAt} IS NOT NULL AND ${pipelineStep.startedAt} < ${staleThresholdISO}::timestamp`
      )
    );

  for (const stale of staleSteps) {
    console.log(`[ai-pipeline] Recovering stale step ${stale.stepOrder} (${stale.modelSlug}) — stuck running > ${STALE_RUNNING_THRESHOLD_MS / 1000}s`);
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

  // 2b. Check if any COUNCIL step (< 100) is currently running — if so, wait.
  //     Council steps are sequential. Generation steps (>= 100) can run in parallel.
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
    // A council step is still running — wait for it
    return null;
  }

  // 2c. Find the next pending step for this job (order by stepOrder)
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

  // DEBUG: log what we're sending to each model
  console.log(`[ai-pipeline] Job ${job.id} step ${step.stepOrder} context: sourceContent=${sourceContent.length} chars, previousOutputs=${previousOutputStrings.length} entries: ${previousOutputStrings.map(o => `${o.role}=${o.output.length}chars`).join(", ")}`);

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

  const prompt = getPrompt(role, contentType, sourceContent, previousOutputStrings, courseContext, job.sourceLanguage);
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
        // Strip markdown fences if model wrapped JSON in ```json ... ```
        let rawJson = response.content.trim();
        const fenceMatch = rawJson.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
        if (fenceMatch) rawJson = fenceMatch[1].trim();
        parsed = JSON.parse(rawJson);

        // Content validation check — creator step may reject invalid contributions
        if (role === "creator" && parsed?.validation === "rejected") {
          const reason = (parsed.reason as string) || "Content validation failed";
          console.log(`[ai-pipeline] Job ${job.id} REJECTED by content validation: ${reason}`);

          // Save the step with rejection
          await db.update(pipelineStep).set({
            status: "completed",
            output: parsed,
            verdict: "rejected",
            issues: [{ field: "validation", description: reason, severity: "critical" }] as any,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            costUsd: costUsd.toFixed(6),
            startedAt: step.startedAt ?? new Date(),
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
          }).where(eq(pipelineStep.id, step.id));

          // Fail the entire pipeline — content is not valid
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
// processGenerationBatch — run generation steps in parallel for one content type
// ---------------------------------------------------------------------------

/**
 * Grab all pending generation steps for the next content type and process
 * them concurrently (up to 5 = one per model). Returns results for all
 * steps processed, or null if nothing to do.
 */
export async function processGenerationBatch(): Promise<{
  jobId: string;
  contentType: string;
  results: Array<{ step: number; model: string; status: string }>;
} | null> {
  // 1. Find the oldest non-terminal job
  const [job] = await db
    .select()
    .from(pipelineJob)
    .where(not(inArray(pipelineJob.status, TERMINAL_STATUSES)))
    .orderBy(asc(pipelineJob.createdAt))
    .limit(1);

  if (!job) return null;

  // 2. Find pending generation steps (stepOrder >= 100)
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

  // 3. Group by content type — process one content type at a time
  const firstType = (pendingGenSteps[0].inputSummary ?? "").replace("generate:", "");
  const batch = pendingGenSteps.filter(
    (s) => (s.inputSummary ?? "").replace("generate:", "") === firstType
  );

  console.log(
    `[ai-pipeline] Job ${job.id} generation batch: ${firstType} — ${batch.length} models in parallel`
  );

  // 4. Process all steps for this content type concurrently
  const results = await Promise.allSettled(
    batch.map(async (step) => {
      // Optimistic lock
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

      // Load model config
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

        // Update job totals
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

  // Check if job is complete after this batch
  const lastStep = batch[batch.length - 1];
  await checkJobCompletion(lastStep, job);

  return {
    jobId: job.id,
    contentType: firstType,
    results: processedResults,
  };
}

// ---------------------------------------------------------------------------
// Job completion check — shared by teacher and generator paths
// ---------------------------------------------------------------------------

/**
 * After a step completes, check if the job should transition:
 * - Teacher steps done (stepOrder < 100) → create generation steps
 * - Generation steps done (stepOrder ≥ 100) → mark job completed
 * - Steps still pending/running → return "step_completed"
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

  // All current steps are terminal (completed/skipped/failed) — check which phase just completed.
  // Teacher steps have stepOrder < 100, generator steps start at 100+.
  const isTeacherStep = step.stepOrder < 100;

  // Also check if there are ANY generator steps already (avoid double-creation)
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

  // Propagate approval to linked contributions + notify subscribers
  await propagateToContributions(job.contributionIds as number[], {
    status: "approved",
  });

  // Notify course subscribers about new content
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
      sourceLanguage: params.sourceLanguage ?? null,
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
