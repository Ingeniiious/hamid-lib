"use server";

import { db } from "@/lib/db";
import { examAttempt, practiceProgress } from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

interface SubmitQuizParams {
  contentId: string;
  courseId: string;
  contentType: "quiz" | "mock_exam";
  answers: { questionIndex: number; selectedIndex: number | null }[];
  score: number;
  total: number;
  perQuestion: { correct: boolean; correctIndex: number }[];
  timeSpentSeconds: number;
}

export async function submitQuizAttempt(params: SubmitQuizParams) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  const userId = session.user.id;
  const scorePct = params.total > 0 ? (params.score / params.total) * 100 : 0;
  const passed = scorePct >= 70;

  // 1. Record the attempt
  await db.insert(examAttempt).values({
    userId,
    contentId: params.contentId,
    courseId: params.courseId,
    contentType: params.contentType,
    answers: params.answers,
    status: "graded",
    totalScore: String(params.score),
    totalPossible: String(params.total),
    autoScore: String(params.score),
    results: params.perQuestion,
    startedAt: new Date(Date.now() - params.timeSpentSeconds * 1000),
    submittedAt: new Date(),
    gradedAt: new Date(),
    timeSpentSeconds: params.timeSpentSeconds,
  });

  // 2. Upsert practice progress
  const [existing] = await db
    .select()
    .from(practiceProgress)
    .where(
      and(
        eq(practiceProgress.userId, userId),
        eq(practiceProgress.courseId, params.courseId),
      ),
    )
    .limit(1);

  if (!existing) {
    // First attempt for this course
    await db.insert(practiceProgress).values({
      userId,
      courseId: params.courseId,
      totalAttempts: 1,
      totalQuestionsAnswered: params.total,
      totalCorrect: params.score,
      bestScorePct: String(scorePct),
      latestScorePct: String(scorePct),
      averageScorePct: String(scorePct),
      firstScorePct: String(scorePct),
      currentStreak: passed ? 1 : 0,
      bestStreak: passed ? 1 : 0,
      totalTimeSpentSeconds: params.timeSpentSeconds,
      lastPracticedAt: new Date(),
    });
  } else {
    const newTotal = existing.totalAttempts + 1;
    const newQAnswered = existing.totalQuestionsAnswered + params.total;
    const newCorrect = existing.totalCorrect + params.score;
    const newAvg = newQAnswered > 0 ? (newCorrect / newQAnswered) * 100 : 0;
    const newBest = Math.max(Number(existing.bestScorePct) || 0, scorePct);
    const newStreak = passed ? existing.currentStreak + 1 : 0;
    const newBestStreak = Math.max(existing.bestStreak, newStreak);

    await db
      .update(practiceProgress)
      .set({
        totalAttempts: newTotal,
        totalQuestionsAnswered: newQAnswered,
        totalCorrect: newCorrect,
        bestScorePct: String(newBest),
        latestScorePct: String(scorePct),
        averageScorePct: String(newAvg),
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        totalTimeSpentSeconds: existing.totalTimeSpentSeconds + params.timeSpentSeconds,
        lastPracticedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(practiceProgress.userId, userId),
          eq(practiceProgress.courseId, params.courseId),
        ),
      );
  }

  return { success: true, scorePct };
}

export async function getPracticeProgress(courseId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select()
    .from(practiceProgress)
    .where(
      and(
        eq(practiceProgress.userId, session.user.id),
        eq(practiceProgress.courseId, courseId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getAttemptHistory(courseId: string, limit = 10) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return [];

  return db
    .select({
      id: examAttempt.id,
      contentType: examAttempt.contentType,
      totalScore: examAttempt.totalScore,
      totalPossible: examAttempt.totalPossible,
      timeSpentSeconds: examAttempt.timeSpentSeconds,
      submittedAt: examAttempt.submittedAt,
    })
    .from(examAttempt)
    .where(
      and(
        eq(examAttempt.userId, session.user.id),
        eq(examAttempt.courseId, courseId),
      ),
    )
    .orderBy(sql`${examAttempt.submittedAt} DESC`)
    .limit(limit);
}
