import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { contribution, extractionJob } from "@/database/schema";
import { eq } from "drizzle-orm";
import { createJob as createPipelineJob } from "@/lib/ai/orchestrator";

export const dynamic = "force-dynamic";

const TEST_COURSE_ID = "__test_lab__";

// Accepted MIME types → our internal file type
const MIME_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
};

/**
 * POST — Re-run pipeline from an existing test-lab contribution.
 * Reuses the file already in R2 — no duplicate upload.
 *
 * Body (JSON):
 *   - contributionId: number (required)
 *   - outputTypes: comma-separated string (default: study_guide,flashcards,quiz)
 *   - skipExtraction: boolean (default: false)
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      contributionId,
      outputTypes: outputTypesRaw,
      skipExtraction,
    } = body as {
      contributionId?: number;
      outputTypes?: string;
      skipExtraction?: boolean;
    };

    if (!contributionId) {
      return NextResponse.json(
        { error: "contributionId is required" },
        { status: 400 }
      );
    }

    // Look up existing contribution
    const [contrib] = await db
      .select()
      .from(contribution)
      .where(eq(contribution.id, contributionId))
      .limit(1);

    if (!contrib || !contrib.fileKey || !contrib.fileUrl) {
      return NextResponse.json(
        { error: "Contribution not found or has no file" },
        { status: 404 }
      );
    }

    const outputTypes = (outputTypesRaw || "study_guide,flashcards,quiz")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const fileType = contrib.fileType
      ? (MIME_MAP[contrib.fileType] ?? "pdf")
      : "pdf";

    if (skipExtraction) {
      // Direct pipeline — skip extraction entirely
      const jobId = await createPipelineJob({
        courseId: TEST_COURSE_ID,
        contributionIds: [contrib.id],
        outputTypes,
        startedBy: session.user.id,
        sourceContent: `# Source: ${contrib.fileName ?? "unknown"}\n\n[Rerun — extraction skipped, using raw file reference]`,
      });

      return NextResponse.json({
        success: true,
        mode: "direct-pipeline",
        contributionId: contrib.id,
        pipelineJobId: jobId,
        fileUrl: contrib.fileUrl,
        outputTypes,
        reused: true,
      });
    }

    // Create new extraction job from existing file data (no R2 upload)
    const [exJob] = await db
      .insert(extractionJob)
      .values({
        contributionId: contrib.id,
        courseId: TEST_COURSE_ID,
        fileName: contrib.fileName ?? "unknown",
        fileKey: contrib.fileKey,
        fileUrl: contrib.fileUrl,
        fileType,
        fileSize: contrib.fileSize ?? 0,
        status: "pending",
        currentPhase: 0,
      })
      .returning({ id: extractionJob.id });

    // Auto-trigger extraction cron — don't wait for 2-min Vercel cron
    const baseUrl = new URL(request.url).origin;
    fetch(`${baseUrl}/api/cron/extraction`, {
      method: "GET",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      mode: "extraction-pipeline",
      contributionId: contrib.id,
      extractionJobId: exJob.id,
      fileUrl: contrib.fileUrl,
      outputTypes,
      reused: true,
    });
  } catch (error) {
    console.error("Test rerun error:", error);
    return NextResponse.json(
      { error: `Rerun failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
