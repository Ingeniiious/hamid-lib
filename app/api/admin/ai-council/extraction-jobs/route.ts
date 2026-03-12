import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { extractionJob } from "@/database/schema";
import { eq, desc, count } from "drizzle-orm";

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
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause — hits extraction_job_status_idx
    const whereClause = statusFilter !== "all"
      ? eq(extractionJob.status, statusFilter)
      : undefined;

    // Count query (hits index)
    const [{ total }] = await db
      .select({ total: count() })
      .from(extractionJob)
      .where(whereClause);

    // Data query — NEVER select extracted_content or source_content (huge JSONB/text blobs)
    // ORDER BY created_at DESC hits extraction_job_created_at_idx
    const jobs = await db
      .select({
        id: extractionJob.id,
        contributionId: extractionJob.contributionId,
        courseId: extractionJob.courseId,
        fileName: extractionJob.fileName,
        fileType: extractionJob.fileType,
        fileSize: extractionJob.fileSize,
        status: extractionJob.status,
        currentPhase: extractionJob.currentPhase,
        totalImages: extractionJob.totalImages,
        processedImages: extractionJob.processedImages,
        extractionTokens: extractionJob.extractionTokens,
        extractionCostUsd: extractionJob.extractionCostUsd,
        errorMessage: extractionJob.errorMessage,
        retryCount: extractionJob.retryCount,
        pipelineJobId: extractionJob.pipelineJobId,
        startedAt: extractionJob.startedAt,
        completedAt: extractionJob.completedAt,
        createdAt: extractionJob.createdAt,
      })
      .from(extractionJob)
      .where(whereClause)
      .orderBy(desc(extractionJob.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error("Extraction jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch extraction jobs" },
      { status: 500 }
    );
  }
}
