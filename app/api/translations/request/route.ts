import { NextRequest, NextResponse } from "next/server";
import { requestTranslation, getLanguageName } from "@/lib/ai/translation";

export const dynamic = "force-dynamic";

/**
 * POST /api/translations/request
 *
 * Request a translation for a piece of generated content.
 * If a translation already exists (any status), returns it.
 * Otherwise creates a pending translation job.
 *
 * Body: { contentId: string, targetLanguage: string, mode?: "batch" | "instant" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, targetLanguage, mode } = body as {
      contentId: string;
      targetLanguage: string;
      mode?: "batch" | "instant";
    };

    if (!contentId || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing required fields: contentId, targetLanguage" },
        { status: 400 },
      );
    }

    // Validate language code
    const langName = getLanguageName(targetLanguage);
    if (langName === targetLanguage && targetLanguage.length !== 2) {
      return NextResponse.json(
        { error: "Invalid language code. Use ISO 639-1 (e.g., 'fa', 'tr', 'en')" },
        { status: 400 },
      );
    }

    const translationMode = mode === "instant" ? "instant" : "batch";

    const result = await requestTranslation(contentId, targetLanguage, translationMode);

    return NextResponse.json({
      id: result.id,
      status: result.status,
      targetLanguage,
      languageName: langName,
      hasContent: result.content !== null || result.richText !== null,
      title: result.title,
    });
  } catch (error) {
    console.error("[translations/request] Error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to request translation" },
      { status: 500 },
    );
  }
}
