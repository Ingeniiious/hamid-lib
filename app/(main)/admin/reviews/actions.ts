"use server";

import { db } from "@/lib/db";
import {
  professorReview,
  professor,
  enrollmentVerification,
} from "@/database/schema";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { eq, desc, sql, and } from "drizzle-orm";

// ── Professor Reviews ──

export async function listProfessorReviews({
  status,
  page = 1,
  limit = 20,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;
  const conditions = status ? eq(professorReview.status, status) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(professorReview)
    .where(conditions);

  const rows = await db
    .select({
      id: professorReview.id,
      overallRating: professorReview.overallRating,
      difficultyRating: professorReview.difficultyRating,
      wouldTakeAgain: professorReview.wouldTakeAgain,
      reviewText: professorReview.reviewText,
      tags: professorReview.tags,
      courseName: professorReview.courseName,
      status: professorReview.status,
      createdAt: professorReview.createdAt,
      userId: professorReview.userId,
      professorName: professor.name,
      professorUniversity: professor.university,
    })
    .from(professorReview)
    .innerJoin(professor, eq(professorReview.professorId, professor.id))
    .where(conditions)
    .orderBy(desc(professorReview.createdAt))
    .limit(limit)
    .offset(offset);

  // Get reviewer names
  const userIds = [...new Set(rows.map((r) => r.userId))];
  let userNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await db.execute<{ id: string; name: string }>(
      sql`SELECT id, name FROM neon_auth."user" WHERE id = ANY(${userIds}::text[])`
    );
    userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  return {
    reviews: rows.map((r) => ({
      ...r,
      reviewerName: userNames[r.userId] || "Unknown",
    })),
    total: countResult.count,
    totalPages: Math.ceil(countResult.count / limit),
  };
}

export async function moderateReview(
  reviewId: number,
  decision: "approved" | "rejected",
  reviewNote?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  await db
    .update(professorReview)
    .set({
      status: decision,
      moderatedBy: session.user.id,
      moderatedAt: new Date(),
    })
    .where(eq(professorReview.id, reviewId));

  await logAdminAction({
    adminUserId: session.user.id,
    action: `professor_review.${decision}`,
    entityType: "professor_review",
    entityId: String(reviewId),
    details: reviewNote ? { reviewNote } : undefined,
  });

  return { success: true };
}

// ── Enrollment Verifications ──

export async function listEnrollmentVerifications({
  status,
  page = 1,
  limit = 20,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;
  const conditions = status ? eq(enrollmentVerification.status, status) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollmentVerification)
    .where(conditions);

  const rows = await db
    .select({
      id: enrollmentVerification.id,
      userId: enrollmentVerification.userId,
      courseName: enrollmentVerification.courseName,
      semester: enrollmentVerification.semester,
      proofFileUrl: enrollmentVerification.proofFileUrl,
      proofFileName: enrollmentVerification.proofFileName,
      status: enrollmentVerification.status,
      reviewNote: enrollmentVerification.reviewNote,
      createdAt: enrollmentVerification.createdAt,
      professorName: professor.name,
      professorUniversity: professor.university,
    })
    .from(enrollmentVerification)
    .innerJoin(professor, eq(enrollmentVerification.professorId, professor.id))
    .where(conditions)
    .orderBy(desc(enrollmentVerification.createdAt))
    .limit(limit)
    .offset(offset);

  // Get user names
  const userIds = [...new Set(rows.map((r) => r.userId))];
  let userNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await db.execute<{ id: string; name: string }>(
      sql`SELECT id, name FROM neon_auth."user" WHERE id = ANY(${userIds}::text[])`
    );
    userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  return {
    verifications: rows.map((r) => ({
      ...r,
      studentName: userNames[r.userId] || "Unknown",
    })),
    total: countResult.count,
    totalPages: Math.ceil(countResult.count / limit),
  };
}

export async function moderateEnrollment(
  id: number,
  decision: "approved" | "rejected",
  reviewNote?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  await db
    .update(enrollmentVerification)
    .set({
      status: decision,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    })
    .where(eq(enrollmentVerification.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: `enrollment_verification.${decision}`,
    entityType: "enrollment_verification",
    entityId: String(id),
    details: reviewNote ? { reviewNote } : undefined,
  });

  return { success: true };
}

// ── Overview ──

export async function getReviewsOverview() {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const [reviewCounts] = await db.execute<{
    pending: string;
    approved: string;
    rejected: string;
    total: string;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE status = 'pending') as pending,
      count(*) FILTER (WHERE status = 'approved') as approved,
      count(*) FILTER (WHERE status = 'rejected') as rejected,
      count(*) as total
    FROM professor_review
  `);

  const [enrollmentCounts] = await db.execute<{
    pending: string;
    approved: string;
    rejected: string;
    total: string;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE status = 'pending') as pending,
      count(*) FILTER (WHERE status = 'approved') as approved,
      count(*) FILTER (WHERE status = 'rejected') as rejected,
      count(*) as total
    FROM enrollment_verification
  `);

  return {
    reviews: {
      pending: parseInt(reviewCounts?.pending || "0"),
      approved: parseInt(reviewCounts?.approved || "0"),
      rejected: parseInt(reviewCounts?.rejected || "0"),
      total: parseInt(reviewCounts?.total || "0"),
    },
    enrollments: {
      pending: parseInt(enrollmentCounts?.pending || "0"),
      approved: parseInt(enrollmentCounts?.approved || "0"),
      rejected: parseInt(enrollmentCounts?.rejected || "0"),
      total: parseInt(enrollmentCounts?.total || "0"),
    },
  };
}
