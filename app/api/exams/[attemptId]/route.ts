import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { examAttempt, generatedContent } from "@/database/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/[attemptId]
 *
 * Retrieve a single exam attempt with its results.
 * Only the owner can view their own attempt.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attemptId } = await params;

    const [attempt] = await db
      .select()
      .from(examAttempt)
      .where(
        and(
          eq(examAttempt.id, attemptId),
          eq(examAttempt.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Fetch the content title for display
    const [content] = await db
      .select({ title: generatedContent.title, contentType: generatedContent.contentType })
      .from(generatedContent)
      .where(eq(generatedContent.id, attempt.contentId))
      .limit(1);

    return NextResponse.json({
      id: attempt.id,
      contentId: attempt.contentId,
      contentType: attempt.contentType,
      contentTitle: content?.title ?? null,
      status: attempt.status,
      answers: attempt.answers,
      results: attempt.results,
      totalScore: Number(attempt.totalScore),
      totalPossible: Number(attempt.totalPossible),
      autoScore: Number(attempt.autoScore),
      aiScore: Number(attempt.aiScore),
      percentage:
        Number(attempt.totalPossible) > 0
          ? Math.round(
              (Number(attempt.totalScore) / Number(attempt.totalPossible)) * 100,
            )
          : 0,
      gradingModel: attempt.gradingModel,
      timeSpentSeconds: attempt.timeSpentSeconds,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
    });
  } catch (error) {
    console.error("[exams/attemptId] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
