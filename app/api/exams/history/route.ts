import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { examAttempt, generatedContent } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/history?contentId=xxx
 *
 * List all attempts for a given content piece by the current user.
 * If no contentId, returns all attempts across all content.
 */
export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentId = request.nextUrl.searchParams.get("contentId");

    const conditions = [eq(examAttempt.userId, session.user.id)];
    if (contentId) {
      conditions.push(eq(examAttempt.contentId, contentId));
    }

    const attempts = await db
      .select({
        id: examAttempt.id,
        contentId: examAttempt.contentId,
        contentType: examAttempt.contentType,
        courseId: examAttempt.courseId,
        status: examAttempt.status,
        totalScore: examAttempt.totalScore,
        totalPossible: examAttempt.totalPossible,
        autoScore: examAttempt.autoScore,
        aiScore: examAttempt.aiScore,
        timeSpentSeconds: examAttempt.timeSpentSeconds,
        submittedAt: examAttempt.submittedAt,
        gradedAt: examAttempt.gradedAt,
        contentTitle: generatedContent.title,
      })
      .from(examAttempt)
      .leftJoin(generatedContent, eq(examAttempt.contentId, generatedContent.id))
      .where(and(...conditions))
      .orderBy(desc(examAttempt.submittedAt))
      .limit(50);

    return NextResponse.json({
      attempts: attempts.map((a) => ({
        ...a,
        totalScore: Number(a.totalScore),
        totalPossible: Number(a.totalPossible),
        autoScore: Number(a.autoScore),
        aiScore: Number(a.aiScore),
        percentage:
          Number(a.totalPossible) > 0
            ? Math.round((Number(a.totalScore) / Number(a.totalPossible)) * 100)
            : 0,
      })),
    });
  } catch (error) {
    console.error("[exams/history] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
