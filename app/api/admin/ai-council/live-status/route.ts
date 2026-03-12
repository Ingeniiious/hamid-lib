import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { extractionJob, pipelineJob, pipelineStep } from "@/database/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — Live status for pipeline tracking.
 *
 * Query params:
 *   - extractionId: UUID of the extraction job
 *   - pipelineId: UUID of the pipeline job (if known)
 *
 * Returns combined status of extraction + pipeline + steps for live tracking.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const extractionId = searchParams.get("extractionId");
  const pipelineId = searchParams.get("pipelineId");

  let extraction: {
    id: string;
    status: string;
    currentPhase: number;
    fileName: string;
    errorMessage: string | null;
    pipelineJobId: string | null;
    extractionTokens: number;
    extractionCostUsd: string;
  } | null = null;

  let pipeline: {
    id: string;
    status: string;
    currentStep: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: string;
    errorMessage: string | null;
  } | null = null;

  let steps: {
    id: number;
    modelSlug: string;
    role: string;
    stepOrder: number;
    status: string;
    verdict: string | null;
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
    durationMs: number | null;
    errorMessage: string | null;
  }[] = [];

  // Fetch extraction job
  if (extractionId) {
    const [exJob] = await db
      .select({
        id: extractionJob.id,
        status: extractionJob.status,
        currentPhase: extractionJob.currentPhase,
        fileName: extractionJob.fileName,
        errorMessage: extractionJob.errorMessage,
        pipelineJobId: extractionJob.pipelineJobId,
        extractionTokens: extractionJob.extractionTokens,
        extractionCostUsd: extractionJob.extractionCostUsd,
      })
      .from(extractionJob)
      .where(eq(extractionJob.id, extractionId))
      .limit(1);

    if (exJob) {
      extraction = exJob;
      // If extraction links to a pipeline job, use that
      if (exJob.pipelineJobId && !pipelineId) {
        const resolvedPipelineId = exJob.pipelineJobId;
        const [pJob] = await db
          .select({
            id: pipelineJob.id,
            status: pipelineJob.status,
            currentStep: pipelineJob.currentStep,
            totalInputTokens: pipelineJob.totalInputTokens,
            totalOutputTokens: pipelineJob.totalOutputTokens,
            totalCostUsd: pipelineJob.totalCostUsd,
            errorMessage: pipelineJob.errorMessage,
          })
          .from(pipelineJob)
          .where(eq(pipelineJob.id, resolvedPipelineId))
          .limit(1);

        if (pJob) pipeline = pJob;
      }
    }
  }

  // Fetch pipeline job (explicit or resolved from extraction)
  const effectivePipelineId = pipelineId ?? pipeline?.id;
  if (pipelineId && !pipeline) {
    const [pJob] = await db
      .select({
        id: pipelineJob.id,
        status: pipelineJob.status,
        currentStep: pipelineJob.currentStep,
        totalInputTokens: pipelineJob.totalInputTokens,
        totalOutputTokens: pipelineJob.totalOutputTokens,
        totalCostUsd: pipelineJob.totalCostUsd,
        errorMessage: pipelineJob.errorMessage,
      })
      .from(pipelineJob)
      .where(eq(pipelineJob.id, pipelineId))
      .limit(1);

    if (pJob) pipeline = pJob;
  }

  // Fetch pipeline steps
  if (effectivePipelineId) {
    steps = await db
      .select({
        id: pipelineStep.id,
        modelSlug: pipelineStep.modelSlug,
        role: pipelineStep.role,
        stepOrder: pipelineStep.stepOrder,
        status: pipelineStep.status,
        verdict: pipelineStep.verdict,
        inputTokens: pipelineStep.inputTokens,
        outputTokens: pipelineStep.outputTokens,
        costUsd: pipelineStep.costUsd,
        durationMs: pipelineStep.durationMs,
        errorMessage: pipelineStep.errorMessage,
      })
      .from(pipelineStep)
      .where(eq(pipelineStep.jobId, effectivePipelineId))
      .orderBy(asc(pipelineStep.stepOrder));
  }

  return NextResponse.json({ extraction, pipeline, steps });
}
