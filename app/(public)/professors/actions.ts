"use server";

import { db } from "@/lib/db";
import {
  professor,
  professorReview,
  contributorVerification,
  enrollmentVerification,
} from "@/database/schema";
import { eq, sql, desc, asc, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { REVIEW_TAGS, type ReviewTag } from "@/lib/professor-constants";

// ── Public queries (no auth needed) ──

export async function searchProfessors(query: string, page = 1, limit = 20) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const offset = (page - 1) * safeLimit;

  const conditions = query.trim()
    ? or(
        ilike(professor.name, `%${query}%`),
        ilike(professor.university, `%${query}%`),
        ilike(professor.department, `%${query}%`)
      )
    : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: professor.id,
        name: professor.name,
        slug: professor.slug,
        university: professor.university,
        department: professor.department,
      })
      .from(professor)
      .where(conditions)
      .orderBy(asc(professor.name))
      .limit(safeLimit)
      .offset(offset),
    db
      .select({ count: sql<string>`count(*)` })
      .from(professor)
      .where(conditions),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // Get aggregate ratings for each professor
  const profIds = rows.map((r) => r.id);
  let ratingsMap = new Map<
    number,
    { avg: number; count: number; wouldTakeAgain: number }
  >();

  if (profIds.length > 0) {
    const ratings = await db.execute<{
      professor_id: number;
      avg_rating: string;
      review_count: string;
      would_take_again_pct: string;
    }>(
      sql`SELECT professor_id,
             ROUND(AVG(overall_rating)::numeric, 1)::text as avg_rating,
             COUNT(*)::text as review_count,
             ROUND(100.0 * SUM(CASE WHEN would_take_again THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::text as would_take_again_pct
           FROM professor_review
           WHERE status = 'approved' AND professor_id = ANY(${profIds}::int[])
           GROUP BY professor_id`
    );
    for (const r of ratings) {
      ratingsMap.set(r.professor_id, {
        avg: Number(r.avg_rating),
        count: Number(r.review_count),
        wouldTakeAgain: Number(r.would_take_again_pct || 0),
      });
    }
  }

  return {
    professors: rows.map((r) => ({
      ...r,
      rating: ratingsMap.get(r.id) || { avg: 0, count: 0, wouldTakeAgain: 0 },
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

export async function getProfessorBySlug(slug: string) {
  const rows = await db
    .select()
    .from(professor)
    .where(eq(professor.slug, slug))
    .limit(1);

  const prof = rows[0];
  if (!prof) return null;

  // Get aggregate stats
  const [stats] = await db.execute<{
    avg_overall: string;
    avg_difficulty: string;
    review_count: string;
    would_take_again_pct: string;
    r1: string; r2: string; r3: string; r4: string; r5: string;
  }>(
    sql`SELECT
          ROUND(AVG(overall_rating)::numeric, 1)::text as avg_overall,
          ROUND(AVG(difficulty_rating)::numeric, 1)::text as avg_difficulty,
          COUNT(*)::text as review_count,
          ROUND(100.0 * SUM(CASE WHEN would_take_again THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0))::text as would_take_again_pct,
          SUM(CASE WHEN overall_rating = 1 THEN 1 ELSE 0 END)::text as r1,
          SUM(CASE WHEN overall_rating = 2 THEN 1 ELSE 0 END)::text as r2,
          SUM(CASE WHEN overall_rating = 3 THEN 1 ELSE 0 END)::text as r3,
          SUM(CASE WHEN overall_rating = 4 THEN 1 ELSE 0 END)::text as r4,
          SUM(CASE WHEN overall_rating = 5 THEN 1 ELSE 0 END)::text as r5
        FROM professor_review
        WHERE professor_id = ${prof.id} AND status = 'approved'`
  );

  // Get approved reviews
  const reviews = await db
    .select({
      id: professorReview.id,
      overallRating: professorReview.overallRating,
      difficultyRating: professorReview.difficultyRating,
      wouldTakeAgain: professorReview.wouldTakeAgain,
      reviewText: professorReview.reviewText,
      tags: professorReview.tags,
      courseName: professorReview.courseName,
      createdAt: professorReview.createdAt,
    })
    .from(professorReview)
    .where(
      and(
        eq(professorReview.professorId, prof.id),
        eq(professorReview.status, "approved")
      )
    )
    .orderBy(desc(professorReview.createdAt))
    .limit(100);

  return {
    ...prof,
    createdAt: prof.createdAt.toISOString(),
    updatedAt: prof.updatedAt.toISOString(),
    stats: {
      avgOverall: Number(stats?.avg_overall || 0),
      avgDifficulty: Number(stats?.avg_difficulty || 0),
      reviewCount: Number(stats?.review_count || 0),
      wouldTakeAgainPct: Number(stats?.would_take_again_pct || 0),
      distribution: [
        Number(stats?.r1 || 0),
        Number(stats?.r2 || 0),
        Number(stats?.r3 || 0),
        Number(stats?.r4 || 0),
        Number(stats?.r5 || 0),
      ],
    },
    reviews: reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getTopProfessors(limit = 12) {
  const safeLimit = Math.min(limit, 50);

  const rows = await db.execute<{
    id: number;
    name: string;
    slug: string;
    university: string;
    department: string | null;
    avg_rating: string;
    review_count: string;
    would_take_again_pct: string;
  }>(
    sql`SELECT p.id, p.name, p.slug, p.university, p.department,
          ROUND(AVG(pr.overall_rating)::numeric, 1)::text as avg_rating,
          COUNT(pr.id)::text as review_count,
          ROUND(100.0 * SUM(CASE WHEN pr.would_take_again THEN 1 ELSE 0 END) / NULLIF(COUNT(pr.id), 0))::text as would_take_again_pct
        FROM professor p
        INNER JOIN professor_review pr ON pr.professor_id = p.id AND pr.status = 'approved'
        GROUP BY p.id
        HAVING COUNT(pr.id) >= 1
        ORDER BY AVG(pr.overall_rating) DESC, COUNT(pr.id) DESC
        LIMIT ${safeLimit}`
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    university: r.university,
    department: r.department,
    rating: {
      avg: Number(r.avg_rating),
      count: Number(r.review_count),
      wouldTakeAgain: Number(r.would_take_again_pct || 0),
    },
  }));
}

// ── Authenticated actions ──

export async function submitReview(data: {
  professorId: number;
  courseId?: string;
  courseName?: string;
  overallRating: number;
  difficultyRating: number;
  wouldTakeAgain: boolean;
  reviewText?: string;
  tags?: string[];
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "You must be logged in to submit a review." };
  }

  // Check contributor verification (university email verified)
  const contributor = await db
    .select({ userId: contributorVerification.userId })
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (contributor.length === 0) {
    return { error: "You must verify your university email before reviewing. Go to Contribute to verify." };
  }

  // Check enrollment verification for this professor (approved)
  const enrollment = await db
    .select({ id: enrollmentVerification.id })
    .from(enrollmentVerification)
    .where(
      and(
        eq(enrollmentVerification.userId, session.user.id),
        eq(enrollmentVerification.professorId, data.professorId),
        eq(enrollmentVerification.status, "approved")
      )
    )
    .limit(1);
  if (enrollment.length === 0) {
    return { error: "You must verify your enrollment in this professor's course before reviewing." };
  }

  // Rate limit: 5 reviews per day
  const rl = await rateLimit(`review:${session.user.id}`, 5, 86400);
  if (!rl.allowed) {
    return { error: "You've reached the daily review limit. Try again tomorrow." };
  }

  // Validate ratings
  if (data.overallRating < 1 || data.overallRating > 5) {
    return { error: "Overall rating must be between 1 and 5." };
  }
  if (data.difficultyRating < 1 || data.difficultyRating > 5) {
    return { error: "Difficulty rating must be between 1 and 5." };
  }

  // Validate review text length
  if (data.reviewText && data.reviewText.length > 2000) {
    return { error: "Review text must be under 2000 characters." };
  }

  // Validate tags
  const validTags = data.tags?.filter((t) =>
    REVIEW_TAGS.includes(t as ReviewTag)
  );

  // Check if user already reviewed this professor
  const existing = await db
    .select({ id: professorReview.id })
    .from(professorReview)
    .where(
      and(
        eq(professorReview.userId, session.user.id),
        eq(professorReview.professorId, data.professorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { error: "You have already reviewed this professor." };
  }

  await db.insert(professorReview).values({
    professorId: data.professorId,
    courseId: data.courseId || null,
    userId: session.user.id,
    overallRating: data.overallRating,
    difficultyRating: data.difficultyRating,
    wouldTakeAgain: data.wouldTakeAgain,
    reviewText: data.reviewText?.trim() || null,
    tags: validTags && validTags.length > 0 ? validTags : null,
    courseName: data.courseName?.trim() || null,
    status: "pending",
  });

  return { success: true };
}

export async function hasUserReviewed(professorId: number) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return false;

  const existing = await db
    .select({ id: professorReview.id })
    .from(professorReview)
    .where(
      and(
        eq(professorReview.userId, session.user.id),
        eq(professorReview.professorId, professorId)
      )
    )
    .limit(1);

  return existing.length > 0;
}

// ── Enrollment verification ──

export async function getReviewEligibility(professorId: number) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { eligible: false, reason: "not_logged_in" as const };
  }

  // Check contributor verification
  const contributor = await db
    .select({ userId: contributorVerification.userId })
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (contributor.length === 0) {
    return { eligible: false, reason: "not_contributor" as const };
  }

  // Check enrollment verification
  const enrollment = await db
    .select({
      id: enrollmentVerification.id,
      status: enrollmentVerification.status,
      reviewNote: enrollmentVerification.reviewNote,
    })
    .from(enrollmentVerification)
    .where(
      and(
        eq(enrollmentVerification.userId, session.user.id),
        eq(enrollmentVerification.professorId, professorId)
      )
    )
    .limit(1);

  if (enrollment.length === 0) {
    return { eligible: false, reason: "no_enrollment" as const };
  }

  if (enrollment[0].status === "pending") {
    return { eligible: false, reason: "enrollment_pending" as const };
  }

  if (enrollment[0].status === "rejected") {
    return {
      eligible: false,
      reason: "enrollment_rejected" as const,
      reviewNote: enrollment[0].reviewNote,
    };
  }

  // Check if already reviewed
  const reviewed = await hasUserReviewed(professorId);
  if (reviewed) {
    return { eligible: false, reason: "already_reviewed" as const };
  }

  return { eligible: true, reason: "eligible" as const };
}

export async function submitEnrollmentVerification(data: {
  professorId: number;
  courseName: string;
  semester: string;
  proofFileKey: string;
  proofFileUrl: string;
  proofFileName: string;
  proofFileSize?: number;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  // Must be a verified contributor first
  const contributor = await db
    .select({ userId: contributorVerification.userId })
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (contributor.length === 0) {
    return { error: "You must verify your university email first." };
  }

  // Rate limit: 10 enrollment submissions per day
  const rl = await rateLimit(`enrollment:${session.user.id}`, 10, 86400);
  if (!rl.allowed) {
    return { error: "Too many submissions. Try again tomorrow." };
  }

  // Validate inputs
  if (!data.courseName?.trim()) {
    return { error: "Course name is required." };
  }
  if (!data.semester?.trim()) {
    return { error: "Semester is required." };
  }
  if (!data.proofFileKey || !data.proofFileUrl || !data.proofFileName) {
    return { error: "Enrollment proof file is required." };
  }

  // Check if professor exists
  const prof = await db
    .select({ id: professor.id })
    .from(professor)
    .where(eq(professor.id, data.professorId))
    .limit(1);
  if (prof.length === 0) {
    return { error: "Professor not found." };
  }

  // Check for existing verification (pending or approved)
  const existing = await db
    .select({ id: enrollmentVerification.id, status: enrollmentVerification.status })
    .from(enrollmentVerification)
    .where(
      and(
        eq(enrollmentVerification.userId, session.user.id),
        eq(enrollmentVerification.professorId, data.professorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].status === "approved") {
      return { error: "Your enrollment is already verified for this professor." };
    }
    if (existing[0].status === "pending") {
      return { error: "You already have a pending enrollment verification for this professor." };
    }
    // If rejected, allow resubmission by updating
    await db
      .update(enrollmentVerification)
      .set({
        courseName: data.courseName.trim(),
        semester: data.semester.trim(),
        proofFileKey: data.proofFileKey,
        proofFileUrl: data.proofFileUrl,
        proofFileName: data.proofFileName,
        proofFileSize: data.proofFileSize || null,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(),
      })
      .where(eq(enrollmentVerification.id, existing[0].id));

    return { success: true, resubmitted: true };
  }

  await db.insert(enrollmentVerification).values({
    userId: session.user.id,
    professorId: data.professorId,
    courseName: data.courseName.trim(),
    semester: data.semester.trim(),
    proofFileKey: data.proofFileKey,
    proofFileUrl: data.proofFileUrl,
    proofFileName: data.proofFileName,
    proofFileSize: data.proofFileSize || null,
  });

  return { success: true };
}
