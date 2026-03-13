import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { pipelineJob, pipelineStep } from "@/database/schema";
import { eq, desc, asc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const statusFilter = url.searchParams.get("status") ?? "all";
  const expandJobId = url.searchParams.get("expand"); // optional: load steps for a specific job
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause — hits pipeline_job_status_idx
    const whereClause = statusFilter !== "all"
      ? eq(pipelineJob.status, statusFilter)
      : undefined;

    // Count query (hits index)
    const [{ total }] = await db
      .select({ total: count() })
      .from(pipelineJob)
      .where(whereClause);

    // Jobs list — select only what's needed for the list view
    // Excludes contributionIds (JSONB array, not needed in list)
    // ORDER BY created_at DESC hits pipeline_job_created_at_idx
    const jobs = await db
      .select({
        id: pipelineJob.id,
        courseId: pipelineJob.courseId,
        status: pipelineJob.status,
        currentStep: pipelineJob.currentStep,
        outputTypes: pipelineJob.outputTypes,
        totalInputTokens: pipelineJob.totalInputTokens,
        totalOutputTokens: pipelineJob.totalOutputTokens,
        totalCostUsd: pipelineJob.totalCostUsd,
        errorMessage: pipelineJob.errorMessage,
        retryCount: pipelineJob.retryCount,
        version: pipelineJob.version,
        startedBy: pipelineJob.startedBy,
        startedAt: pipelineJob.startedAt,
        completedAt: pipelineJob.completedAt,
        createdAt: pipelineJob.createdAt,
      })
      .from(pipelineJob)
      .where(whereClause)
      .orderBy(desc(pipelineJob.createdAt))
      .limit(limit)
      .offset(offset);

    // Optionally expand a single job's steps (for detail view)
    // WHERE job_id = ? hits pipeline_step_job_id_idx
    // Excludes output and issues (large JSONB blobs)
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
      retryCount: number;
      inputSummary: string | null;
      startedAt: Date | null;
      completedAt: Date | null;
    }[] | undefined;

    if (expandJobId) {
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
          retryCount: pipelineStep.retryCount,
          inputSummary: pipelineStep.inputSummary,
          startedAt: pipelineStep.startedAt,
          completedAt: pipelineStep.completedAt,
        })
        .from(pipelineStep)
        .where(eq(pipelineStep.jobId, expandJobId))
        .orderBy(asc(pipelineStep.stepOrder));
    }

    return NextResponse.json({
      jobs,
      steps,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error("Pipeline jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline jobs" },
      { status: 500 }
    );
  }
}
