import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { pipelineJob, pipelineStep, generatedContent, course } from "@/database/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — Full pipeline job detail with all steps (including output/issues JSONB)
 * and generated content items.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    // Fetch job with course title
    const [job] = await db
      .select({
        id: pipelineJob.id,
        courseId: pipelineJob.courseId,
        courseTitle: course.title,
        contributionIds: pipelineJob.contributionIds,
        status: pipelineJob.status,
        currentStep: pipelineJob.currentStep,
        outputTypes: pipelineJob.outputTypes,
        sourceLanguage: pipelineJob.sourceLanguage,
        errorMessage: pipelineJob.errorMessage,
        retryCount: pipelineJob.retryCount,
        maxRetries: pipelineJob.maxRetries,
        totalInputTokens: pipelineJob.totalInputTokens,
        totalOutputTokens: pipelineJob.totalOutputTokens,
        totalCostUsd: pipelineJob.totalCostUsd,
        version: pipelineJob.version,
        startedBy: pipelineJob.startedBy,
        startedAt: pipelineJob.startedAt,
        completedAt: pipelineJob.completedAt,
        createdAt: pipelineJob.createdAt,
        updatedAt: pipelineJob.updatedAt,
      })
      .from(pipelineJob)
      .leftJoin(course, eq(pipelineJob.courseId, course.id))
      .where(eq(pipelineJob.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch ALL step columns including output and issues (large JSONB)
    const steps = await db
      .select()
      .from(pipelineStep)
      .where(eq(pipelineStep.jobId, jobId))
      .orderBy(asc(pipelineStep.stepOrder));

    // Fetch generated content
    const content = await db
      .select({
        id: generatedContent.id,
        contentType: generatedContent.contentType,
        title: generatedContent.title,
        content: generatedContent.content,
        richText: generatedContent.richText,
        language: generatedContent.language,
        modelSource: generatedContent.modelSource,
        version: generatedContent.version,
        isPublished: generatedContent.isPublished,
        createdAt: generatedContent.createdAt,
      })
      .from(generatedContent)
      .where(eq(generatedContent.jobId, jobId));

    return NextResponse.json({ job, steps, generatedContent: content });
  } catch (error) {
    console.error("Pipeline job detail fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline job" },
      { status: 500 }
    );
  }
}
