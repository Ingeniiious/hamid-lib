import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentTranslation } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { getLanguageName } from "@/lib/ai/translation";

export const dynamic = "force-dynamic";

/**
 * GET /api/translations/status?contentId=...&targetLanguage=...
 *
 * Check translation status and get the result if completed.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId");
  const targetLanguage = searchParams.get("targetLanguage");

  if (!contentId || !targetLanguage) {
    return NextResponse.json(
      { error: "Missing required params: contentId, targetLanguage" },
      { status: 400 },
    );
  }

  const [translation] = await db
    .select()
    .from(contentTranslation)
    .where(
      and(
        eq(contentTranslation.contentId, contentId),
        eq(contentTranslation.targetLanguage, targetLanguage),
      ),
    )
    .limit(1);

  if (!translation) {
    return NextResponse.json(
      { error: "Translation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: translation.id,
    contentId: translation.contentId,
    targetLanguage: translation.targetLanguage,
    languageName: getLanguageName(translation.targetLanguage),
    status: translation.status,
    title: translation.title,
    description: translation.description,
    content: translation.status === "completed" ? translation.content : null,
    richText: translation.status === "completed" ? translation.richText : null,
    translatedBy: translation.translatedBy,
    translationMode: translation.translationMode,
    inputTokens: translation.inputTokens,
    outputTokens: translation.outputTokens,
    costUsd: translation.costUsd,
    errorMessage: translation.errorMessage,
    completedAt: translation.completedAt,
    createdAt: translation.createdAt,
  });
}
