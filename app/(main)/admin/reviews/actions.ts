"use server";

import { db } from "@/lib/db";
import {
  professorReview,
  professor,
  enrollmentVerification,
} from "@/database/schema";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { eq, desc, sql } from "drizzle-orm";

// ── Professor Reviews ──

export async function listProfessorReviews({
  status,
  page = 1,
  limit = 25,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;
  const conditions = status ? eq(professorReview.status, status) : undefined;

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
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(professorReview)
    .innerJoin(professor, eq(professorReview.professorId, professor.id))
    .where(conditions)
    .orderBy(desc(professorReview.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

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
    reviews: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      reviewerName: userNames[r.userId] || "Unknown",
    })),
    total,
    totalPages: Math.ceil(total / limit),
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
  limit = 25,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;
  const conditions = status ? eq(enrollmentVerification.status, status) : undefined;

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
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(enrollmentVerification)
    .innerJoin(professor, eq(enrollmentVerification.professorId, professor.id))
    .where(conditions)
    .orderBy(desc(enrollmentVerification.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

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
    verifications: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      studentName: userNames[r.userId] || "Unknown",
    })),
    total,
    totalPages: Math.ceil(total / limit),
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

// ── Overview (single query) ──

export async function getReviewsOverview() {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const [stats] = await db.execute<{
    rev_pending: string;
    rev_approved: string;
    rev_rejected: string;
    rev_total: string;
    enr_pending: string;
    enr_approved: string;
    enr_rejected: string;
    enr_total: string;
  }>(sql`
    SELECT
      (SELECT count(*) FILTER (WHERE status = 'pending') FROM professor_review) as rev_pending,
      (SELECT count(*) FILTER (WHERE status = 'approved') FROM professor_review) as rev_approved,
      (SELECT count(*) FILTER (WHERE status = 'rejected') FROM professor_review) as rev_rejected,
      (SELECT count(*) FROM professor_review) as rev_total,
      (SELECT count(*) FILTER (WHERE status = 'pending') FROM enrollment_verification) as enr_pending,
      (SELECT count(*) FILTER (WHERE status = 'approved') FROM enrollment_verification) as enr_approved,
      (SELECT count(*) FILTER (WHERE status = 'rejected') FROM enrollment_verification) as enr_rejected,
      (SELECT count(*) FROM enrollment_verification) as enr_total
  `);

  return {
    reviews: {
      pending: parseInt(stats?.rev_pending || "0"),
      approved: parseInt(stats?.rev_approved || "0"),
      rejected: parseInt(stats?.rev_rejected || "0"),
      total: parseInt(stats?.rev_total || "0"),
    },
    enrollments: {
      pending: parseInt(stats?.enr_pending || "0"),
      approved: parseInt(stats?.enr_approved || "0"),
      rejected: parseInt(stats?.enr_rejected || "0"),
      total: parseInt(stats?.enr_total || "0"),
    },
  };
}
