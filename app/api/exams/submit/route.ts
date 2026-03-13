import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { examAttempt, generatedContent } from "@/database/schema";
import { eq } from "drizzle-orm";
import { gradeQuiz, gradeMockExam } from "@/lib/ai/grading";
import type { QuizContent, MockExamContent } from "@/lib/ai/types";
import type { QuizSubmission, MockExamSubmission } from "@/lib/ai/grading";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI grading can take a bit

/**
 * POST /api/exams/submit
 *
 * Submit answers for a quiz or mock exam.
 * - Quiz: instantly graded by code, returns results immediately.
 * - Mock exam: auto questions graded instantly, AI questions graded by Kimi.
 *
 * Body: {
 *   contentId: string,        // generated_content ID
 *   answers: number[] | Record<string, string | number | number[]>,
 *   timeSpentSeconds?: number,
 *   startedAt?: string,       // ISO timestamp
 * }
 */
export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentId, answers, timeSpentSeconds, startedAt } = body;

    if (!contentId || !answers) {
      return NextResponse.json({ error: "contentId and answers are required" }, { status: 400 });
    }

    // Fetch the content
    const [content] = await db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.id, contentId))
      .limit(1);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.contentType !== "quiz" && content.contentType !== "mock_exam") {
      return NextResponse.json({ error: "Content is not a quiz or mock exam" }, { status: 400 });
    }

    const contentData = content.content as Record<string, unknown>;

    // Grade based on content type
    let gradingResult;

    if (content.contentType === "quiz") {
      const quizContent = contentData as unknown as QuizContent;
      const submission: QuizSubmission = { answers, timeSpentSeconds };
      gradingResult = gradeQuiz(quizContent, submission);
    } else {
      const examContent = contentData as unknown as MockExamContent;
      const submission: MockExamSubmission = { answers, timeSpentSeconds };
      gradingResult = await gradeMockExam(examContent, submission);
    }

    // Save attempt
    const [attempt] = await db
      .insert(examAttempt)
      .values({
        userId: session.user.id,
        contentId,
        courseId: content.courseId,
        contentType: content.contentType,
        answers,
        status: "graded",
        totalScore: String(gradingResult.totalScore),
        totalPossible: String(gradingResult.totalPossible),
        autoScore: String(gradingResult.autoScore),
        aiScore: String(gradingResult.aiScore),
        results: gradingResult.results,
        gradingModel: gradingResult.gradingModel ?? null,
        gradingTokens: gradingResult.gradingTokens ?? 0,
        gradingCostUsd: String(gradingResult.gradingCostUsd ?? 0),
        startedAt: startedAt ? new Date(startedAt) : null,
        timeSpentSeconds: timeSpentSeconds ?? null,
        gradedAt: new Date(),
      })
      .returning({ id: examAttempt.id });

    return NextResponse.json({
      attemptId: attempt.id,
      score: gradingResult.totalScore,
      totalPossible: gradingResult.totalPossible,
      percentage: gradingResult.totalPossible > 0
        ? Math.round((gradingResult.totalScore / gradingResult.totalPossible) * 100)
        : 0,
      results: gradingResult.results,
      autoScore: gradingResult.autoScore,
      aiScore: gradingResult.aiScore,
      gradingModel: gradingResult.gradingModel,
    });
  } catch (error) {
    console.error("[exams/submit] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
