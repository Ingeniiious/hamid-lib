import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { generatedContent } from "@/database/schema";
import { eq } from "drizzle-orm";
import { gradeQuiz, gradeMockExam } from "@/lib/ai/grading";
import type { QuizContent, MockExamContent } from "@/lib/ai/types";
import type { QuizSubmission, MockExamSubmission } from "@/lib/ai/grading";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/exams/grade
 *
 * Admin-only endpoint to test grading on existing content.
 * Does NOT save an attempt — just returns grading results for testing.
 *
 * Body: {
 *   contentId: string,
 *   answers: number[] | Record<string, string | number | number[]>,
 * }
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentId, answers } = body;

    if (!contentId || !answers) {
      return NextResponse.json({ error: "contentId and answers are required" }, { status: 400 });
    }

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
    let gradingResult;

    if (content.contentType === "quiz") {
      const quizContent = contentData as unknown as QuizContent;
      const submission: QuizSubmission = { answers };
      gradingResult = gradeQuiz(quizContent, submission);
    } else {
      const examContent = contentData as unknown as MockExamContent;
      const submission: MockExamSubmission = { answers };
      gradingResult = await gradeMockExam(examContent, submission);
    }

    return NextResponse.json({
      contentId,
      contentType: content.contentType,
      title: content.title,
      ...gradingResult,
      percentage:
        gradingResult.totalPossible > 0
          ? Math.round((gradingResult.totalScore / gradingResult.totalPossible) * 100)
          : 0,
    });
  } catch (error) {
    console.error("[admin/exams/grade] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
