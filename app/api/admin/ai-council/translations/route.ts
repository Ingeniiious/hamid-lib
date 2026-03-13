import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { contentTranslation, generatedContent } from "@/database/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getLanguageName } from "@/lib/ai/translation";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ai-council/translations
 *
 * List all translation jobs with pagination and optional status filter.
 * Query params: ?status=pending|processing|completed|failed&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (status) {
    conditions.push(eq(contentTranslation.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch translations with original content info
  const [translations, [countResult]] = await Promise.all([
    db
      .select({
        id: contentTranslation.id,
        contentId: contentTranslation.contentId,
        targetLanguage: contentTranslation.targetLanguage,
        title: contentTranslation.title,
        translatedBy: contentTranslation.translatedBy,
        translationMode: contentTranslation.translationMode,
        status: contentTranslation.status,
        inputTokens: contentTranslation.inputTokens,
        outputTokens: contentTranslation.outputTokens,
        costUsd: contentTranslation.costUsd,
        errorMessage: contentTranslation.errorMessage,
        completedAt: contentTranslation.completedAt,
        createdAt: contentTranslation.createdAt,
        // Original content info
        originalTitle: generatedContent.title,
        originalLanguage: generatedContent.language,
        contentType: generatedContent.contentType,
        courseId: generatedContent.courseId,
      })
      .from(contentTranslation)
      .leftJoin(generatedContent, eq(contentTranslation.contentId, generatedContent.id))
      .where(where)
      .orderBy(desc(contentTranslation.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentTranslation)
      .where(where),
  ]);

  const total = Number(countResult.count);

  return NextResponse.json({
    translations: translations.map((t) => ({
      ...t,
      languageName: getLanguageName(t.targetLanguage),
      originalLanguageName: getLanguageName(t.originalLanguage ?? "en"),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST /api/admin/ai-council/translations
 *
 * Admin actions: retry failed translations or cancel pending ones.
 * Body: { action: "retry" | "cancel", translationId: string }
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, translationId } = body as {
      action: string;
      translationId: string;
    };

    if (!action || !translationId) {
      return NextResponse.json(
        { error: "Missing required fields: action, translationId" },
        { status: 400 },
      );
    }

    const [translation] = await db
      .select()
      .from(contentTranslation)
      .where(eq(contentTranslation.id, translationId))
      .limit(1);

    if (!translation) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 });
    }

    if (action === "retry") {
      if (translation.status !== "failed") {
        return NextResponse.json(
          { error: "Only failed translations can be retried" },
          { status: 409 },
        );
      }

      await db
        .update(contentTranslation)
        .set({
          status: "pending",
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(contentTranslation.id, translationId));

      return NextResponse.json({ success: true, action: "retry", translationId });
    }

    if (action === "cancel") {
      if (translation.status === "completed" || translation.status === "failed") {
        return NextResponse.json(
          { error: "Cannot cancel a terminal translation" },
          { status: 409 },
        );
      }

      await db
        .update(contentTranslation)
        .set({
          status: "failed",
          errorMessage: "Cancelled by admin",
          updatedAt: new Date(),
        })
        .where(eq(contentTranslation.id, translationId));

      return NextResponse.json({ success: true, action: "cancel", translationId });
    }

    return NextResponse.json(
      { error: "Invalid action. Must be 'retry' or 'cancel'" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[admin/translations] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 },
    );
  }
}
