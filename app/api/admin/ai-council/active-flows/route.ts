import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { extractionJob, pipelineJob, pipelineStep } from "@/database/schema";
import { eq, not, inArray, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — Returns up to 5 most recent non-terminal jobs (extraction or pipeline)
 * with full step data for pipeline flow visualization.
 */
export async function GET() {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const TERMINAL = ["completed", "failed", "cancelled"];

    // Fetch up to 5 active pipeline jobs (most recent first)
    const activePipelines = await db
      .select({
        id: pipelineJob.id,
        courseId: pipelineJob.courseId,
        status: pipelineJob.status,
        currentStep: pipelineJob.currentStep,
        totalInputTokens: pipelineJob.totalInputTokens,
        totalOutputTokens: pipelineJob.totalOutputTokens,
        totalCostUsd: pipelineJob.totalCostUsd,
        errorMessage: pipelineJob.errorMessage,
        startedAt: pipelineJob.startedAt,
        createdAt: pipelineJob.createdAt,
      })
      .from(pipelineJob)
      .where(not(inArray(pipelineJob.status, TERMINAL)))
      .orderBy(desc(pipelineJob.createdAt))
      .limit(5);

    // Fetch steps for all active pipeline jobs
    const pipelineIds = activePipelines.map((j) => j.id);
    let allSteps: {
      jobId: string;
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

    if (pipelineIds.length > 0) {
      allSteps = await db
        .select({
          jobId: pipelineStep.jobId,
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
        .where(inArray(pipelineStep.jobId, pipelineIds))
        .orderBy(asc(pipelineStep.stepOrder));
    }

    // Fetch active extraction jobs (not yet linked to a pipeline)
    const activeExtractions = await db
      .select({
        id: extractionJob.id,
        fileName: extractionJob.fileName,
        fileType: extractionJob.fileType,
        status: extractionJob.status,
        currentPhase: extractionJob.currentPhase,
        totalImages: extractionJob.totalImages,
        processedImages: extractionJob.processedImages,
        errorMessage: extractionJob.errorMessage,
        createdAt: extractionJob.createdAt,
      })
      .from(extractionJob)
      .where(not(inArray(extractionJob.status, ["completed", "failed"])))
      .orderBy(desc(extractionJob.createdAt))
      .limit(5);

    // Group steps by job
    const stepsByJob = new Map<string, typeof allSteps>();
    for (const step of allSteps) {
      const existing = stepsByJob.get(step.jobId) ?? [];
      existing.push(step);
      stepsByJob.set(step.jobId, existing);
    }

    // Build combined flows
    const flows = [
      // Extraction-only flows (no pipeline yet)
      ...activeExtractions.map((ex) => ({
        type: "extraction" as const,
        id: ex.id,
        label: ex.fileName,
        fileType: ex.fileType,
        extractionStatus: ex.status,
        extractionPhase: ex.currentPhase,
        extractionImages: `${ex.processedImages}/${ex.totalImages}`,
        pipelineStatus: null,
        steps: [] as typeof allSteps,
        totalTokens: 0,
        totalCost: "0",
        createdAt: ex.createdAt,
      })),
      // Pipeline flows
      ...activePipelines.map((pj) => ({
        type: "pipeline" as const,
        id: pj.id,
        label: pj.courseId === "__test_lab__" ? "Test Lab" : pj.courseId.slice(0, 16),
        fileType: null,
        extractionStatus: null,
        extractionPhase: null,
        extractionImages: null,
        pipelineStatus: pj.status,
        steps: stepsByJob.get(pj.id) ?? [],
        totalTokens: pj.totalInputTokens + pj.totalOutputTokens,
        totalCost: pj.totalCostUsd,
        createdAt: pj.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return NextResponse.json({ flows });
  } catch (error) {
    console.error("Active flows error:", error);
    return NextResponse.json({ error: "Failed to fetch active flows" }, { status: 500 });
  }
}
