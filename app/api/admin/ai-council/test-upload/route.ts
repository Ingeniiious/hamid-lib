import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { course, contribution, extractionJob } from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
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
 * POST — Upload a file for pipeline testing.
 *
 * Body: multipart/form-data with:
 *   - file: the PDF/DOCX/PPTX/image
 *   - outputTypes: comma-separated content types (default: study_guide,flashcards,quiz)
 *   - skipExtraction: "true" to skip extraction pipeline and feed raw text directly to council
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const outputTypesRaw = (form.get("outputTypes") as string) ?? "study_guide,flashcards,quiz";
    const skipExtraction = (form.get("skipExtraction") as string) === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = MIME_MAP[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Accepted: PDF, DOCX, PPTX, PNG, JPEG, WebP` },
        { status: 400 }
      );
    }

    const outputTypes = outputTypesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Ensure test course exists
    const [existing] = await db
      .select({ id: course.id })
      .from(course)
      .where(eq(course.id, TEST_COURSE_ID))
      .limit(1);

    if (!existing) {
      await db.insert(course).values({
        id: TEST_COURSE_ID,
        title: "Test Lab",
        description: "Internal test course for AI Council pipeline testing",
        slug: "test-lab",
        createdBy: session.user.id,
      });
    }

    // Upload to R2
    const bytes = new Uint8Array(await file.arrayBuffer());
    const objectKey = `test-lab/${Date.now()}-${file.name}`;
    const uploadResult = await uploadToR2(bytes, objectKey, file.type);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    // Create contribution record
    const [contrib] = await db
      .insert(contribution)
      .values({
        userId: session.user.id,
        courseId: TEST_COURSE_ID,
        title: `[Test] ${file.name}`,
        description: "Admin test upload for pipeline testing",
        type: "file",
        fileKey: objectKey,
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileSize: bytes.length,
        fileType: file.type,
        status: "approved",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      })
      .returning({ id: contribution.id });

    if (skipExtraction) {
      // Read the file as text and feed directly to the council pipeline
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const sourceContent = `# Source: ${file.name}\n\n## Text Content\n\n${text.slice(0, 200_000)}`;

      const jobId = await createPipelineJob({
        courseId: TEST_COURSE_ID,
        contributionIds: [contrib.id],
        outputTypes,
        startedBy: session.user.id,
        sourceContent,
      });

      return NextResponse.json({
        success: true,
        mode: "direct-pipeline",
        contributionId: contrib.id,
        pipelineJobId: jobId,
        fileUrl: uploadResult.url,
        outputTypes,
      });
    }

    // Create extraction job — the cron will pick it up
    const [exJob] = await db
      .insert(extractionJob)
      .values({
        contributionId: contrib.id,
        courseId: TEST_COURSE_ID,
        fileName: file.name,
        fileKey: objectKey,
        fileUrl: uploadResult.url,
        fileType,
        fileSize: bytes.length,
        outputTypes,
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
      fileUrl: uploadResult.url,
      outputTypes,
    });
  } catch (error) {
    console.error("Test upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
