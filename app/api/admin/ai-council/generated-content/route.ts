import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — Fetch generated content for a pipeline job.
 * Query: ?jobId=<uuid>
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  try {
    const items = await db
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

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Generated content fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generated content" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Publish or unpublish a generated content item.
 * Body: { contentId: string, isPublished: boolean }
 */
export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentId, isPublished } = body;

    if (!contentId || typeof isPublished !== "boolean") {
      return NextResponse.json(
        { error: "contentId (string) and isPublished (boolean) are required" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(generatedContent)
      .set({
        isPublished,
        publishedAt: isPublished ? sql`now()` : null,
        updatedAt: sql`now()`,
      })
      .where(eq(generatedContent.id, contentId))
      .returning({
        id: generatedContent.id,
        isPublished: generatedContent.isPublished,
        publishedAt: generatedContent.publishedAt,
      });

    if (!updated) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("Generated content publish toggle error:", error);
    return NextResponse.json(
      { error: "Failed to update publish status" },
      { status: 500 },
    );
  }
}
