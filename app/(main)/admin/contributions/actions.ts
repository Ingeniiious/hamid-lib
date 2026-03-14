"use server";

import { db } from "@/lib/db";
import {
  contribution,
  contentRequest,
  contentReport,
  contributorStats,
  contributorVerification,
  contributionAppeal,
  universityDomain,
  faculty,
  course,
} from "@/database/schema";
import { getAdminSession } from "@/lib/admin/auth";
import { requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { eq, desc, sql, and, asc } from "drizzle-orm";
import { sqlInList } from "@/lib/db";
import { nanoid } from "nanoid";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ==================
// Contributions
// ==================

export async function listContributions({
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

  const conditions = status ? eq(contribution.status, status) : undefined;

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      type: contribution.type,
      status: contribution.status,
      fileName: contribution.fileName,
      fileUrl: contribution.fileUrl,
      textContent: sql<string | null>`LEFT(${contribution.textContent}, 300)`.as("text_content"),
      reportCount: contribution.reportCount,
      reviewNote: contribution.reviewNote,
      createdAt: contribution.createdAt,
      userId: contribution.userId,
      courseTitle: course.title,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(contribution)
    .leftJoin(course, eq(contribution.courseId, course.id))
    .where(conditions)
    .orderBy(desc(contribution.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  // Get contributor names
  const userIds = [...new Set(rows.map((r) => r.userId))];
  let userNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await db.execute<{ id: string; name: string }>(
      sql`SELECT id::text, name FROM neon_auth."user" WHERE id::text IN (${sqlInList(userIds)})`
    );
    userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  return {
    contributions: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      contributorName: userNames[r.userId] || "Unknown",
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function reviewContribution(
  id: number,
  decision: "approved" | "rejected",
  reviewNote?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  // Get the contribution to find the userId
  const [c] = await db
    .select({ userId: contribution.userId, status: contribution.status })
    .from(contribution)
    .where(eq(contribution.id, id))
    .limit(1);

  if (!c) return { error: "Contribution not found." };

  await db
    .update(contribution)
    .set({
      status: decision,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
      updatedAt: new Date(),
    })
    .where(eq(contribution.id, id));

  // Update contributor stats on approval
  if (decision === "approved") {
    await db
      .update(contributorStats)
      .set({
        approvedContributions: sql`${contributorStats.approvedContributions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(contributorStats.userId, c.userId));
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: `contribution.${decision}`,
    entityType: "contribution",
    entityId: String(id),
    details: reviewNote ? { reviewNote } : undefined,
  });

  return { success: true };
}

// ==================
// Content Requests
// ==================

export async function listContentRequests({
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
  const conditions = status ? eq(contentRequest.status, status) : undefined;

  const rows = await db
    .select({
      id: contentRequest.id,
      type: contentRequest.type,
      facultyName: contentRequest.facultyName,
      courseName: contentRequest.courseName,
      courseProfessor: contentRequest.courseProfessor,
      courseSemester: contentRequest.courseSemester,
      universityName: contentRequest.universityName,
      status: contentRequest.status,
      reviewNote: contentRequest.reviewNote,
      createdAt: contentRequest.createdAt,
      userId: contentRequest.userId,
      existingFacultyId: contentRequest.existingFacultyId,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(contentRequest)
    .where(conditions)
    .orderBy(desc(contentRequest.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  // Get requester names
  const userIds = [...new Set(rows.map((r) => r.userId))];
  let userNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await db.execute<{ id: string; name: string }>(
      sql`SELECT id::text, name FROM neon_auth."user" WHERE id::text IN (${sqlInList(userIds)})`
    );
    userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  return {
    requests: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      requesterName: userNames[r.userId] || "Unknown",
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function reviewContentRequest(
  id: number,
  decision: "approved" | "rejected",
  reviewNote?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  const [req] = await db
    .select()
    .from(contentRequest)
    .where(eq(contentRequest.id, id))
    .limit(1);

  if (!req) return { error: "Request not found." };

  // On approve, auto-create the faculty or course
  if (decision === "approved") {
    if (req.type === "faculty" && req.facultyName) {
      const slug = slugify(req.facultyName);
      await db
        .insert(faculty)
        .values({
          name: req.facultyName,
          slug: `${slug}-${nanoid(4)}`,
          university: req.universityName || "Unknown",
          displayOrder: 99,
        })
        .onConflictDoNothing();
    } else if (req.type === "course" && req.courseName && req.existingFacultyId) {
      await db
        .insert(course)
        .values({
          id: nanoid(12),
          title: req.courseName,
          slug: `${slugify(req.courseName)}-${nanoid(4)}`,
          professor: req.courseProfessor || null,
          semester: req.courseSemester || null,
          facultyId: req.existingFacultyId,
        })
        .onConflictDoNothing();
    }
  }

  await db
    .update(contentRequest)
    .set({
      status: decision,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    })
    .where(eq(contentRequest.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: `content_request.${decision}`,
    entityType: "content_request",
    entityId: String(id),
    details: reviewNote ? { reviewNote } : undefined,
  });

  return { success: true };
}

// ==================
// University Domains
// ==================

export async function listUniversityDomains({
  page = 1,
  limit = 25,
  search,
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;

  const conditions = search
    ? sql`${universityDomain.domain} ILIKE ${"%" + search + "%"} OR ${universityDomain.universityName} ILIKE ${"%" + search + "%"}`
    : undefined;

  const rows = await db
    .select({
      id: universityDomain.id,
      universityName: universityDomain.universityName,
      domain: universityDomain.domain,
      country: universityDomain.country,
      createdAt: universityDomain.createdAt,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(universityDomain)
    .where(conditions)
    .orderBy(asc(universityDomain.universityName))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  return {
    domains: rows.map(({ totalCount: _, ...r }) => r),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function addUniversityDomain({
  universityName,
  domain,
  country,
}: {
  universityName: string;
  domain: string;
  country?: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  const domainLower = domain.toLowerCase().trim();
  if (!domainLower || !domainLower.includes(".")) {
    return { error: "Invalid domain." };
  }

  try {
    await db.insert(universityDomain).values({
      universityName: universityName.trim(),
      domain: domainLower,
      country: country?.trim() || null,
    });
  } catch {
    return { error: "Domain already exists." };
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: "university_domain.add",
    entityType: "university_domain",
    details: { domain: domainLower, universityName },
  });

  return { success: true };
}

export async function deleteUniversityDomain(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  const [d] = await db
    .select({ domain: universityDomain.domain })
    .from(universityDomain)
    .where(eq(universityDomain.id, id))
    .limit(1);

  await db.delete(universityDomain).where(eq(universityDomain.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "university_domain.delete",
    entityType: "university_domain",
    entityId: String(id),
    details: d ? { domain: d.domain } : undefined,
  });

  return { success: true };
}

export async function lookupDomainRDAP(domain: string) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { error: `RDAP lookup failed (${res.status})` };
    const data = await res.json();

    return {
      success: true,
      name: data.name || domain,
      status: data.status || [],
      events: (data.events || []).map(
        (e: { eventAction: string; eventDate: string }) => ({
          action: e.eventAction,
          date: e.eventDate,
        })
      ),
      nameservers: (data.nameservers || []).map(
        (ns: { ldhName: string }) => ns.ldhName
      ),
      entities: (data.entities || [])
        .slice(0, 3)
        .map((e: { handle: string; roles: string[] }) => ({
          handle: e.handle,
          roles: e.roles,
        })),
    };
  } catch {
    return { error: "RDAP lookup timed out or failed." };
  }
}

// ==================
// Overview / Counts (single query)
// ==================

export async function getContributionOverview() {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const [stats] = await db.execute<{
    contrib_pending: string;
    contrib_under_review: string;
    contrib_total: string;
    requests_pending: string;
    requests_total: string;
    reports_pending: string;
    reports_total: string;
    domains_total: string;
  }>(sql`
    SELECT
      (SELECT count(*) FILTER (WHERE status = 'pending') FROM contribution) as contrib_pending,
      (SELECT count(*) FILTER (WHERE status = 'under_review') FROM contribution) as contrib_under_review,
      (SELECT count(*) FROM contribution) as contrib_total,
      (SELECT count(*) FILTER (WHERE status = 'pending') FROM content_request) as requests_pending,
      (SELECT count(*) FROM content_request) as requests_total,
      (SELECT count(*) FILTER (WHERE status = 'pending') FROM content_report) as reports_pending,
      (SELECT count(*) FROM content_report) as reports_total,
      (SELECT count(*) FROM university_domain) as domains_total
  `);

  return {
    contributions: {
      pending: parseInt(stats.contrib_pending),
      underReview: parseInt(stats.contrib_under_review),
      total: parseInt(stats.contrib_total),
    },
    requests: {
      pending: parseInt(stats.requests_pending),
      total: parseInt(stats.requests_total),
    },
    reports: {
      pending: parseInt(stats.reports_pending),
      total: parseInt(stats.reports_total),
    },
    domains: {
      total: parseInt(stats.domains_total),
    },
  };
}

// ==================
// Reports
// ==================

export async function listReports({
  contributionId,
  status,
  page = 1,
  limit = 25,
}: {
  contributionId?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.view");

  const offset = (page - 1) * limit;
  const conditions = [];
  if (contributionId) conditions.push(eq(contentReport.contributionId, contributionId));
  if (status) conditions.push(eq(contentReport.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: contentReport.id,
      contributionId: contentReport.contributionId,
      reason: contentReport.reason,
      description: contentReport.description,
      evidenceFileUrl: contentReport.evidenceFileUrl,
      evidenceFileName: contentReport.evidenceFileName,
      status: contentReport.status,
      reviewNote: contentReport.reviewNote,
      createdAt: contentReport.createdAt,
      reporterId: contentReport.reporterId,
      contributionTitle: contribution.title,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(contentReport)
    .leftJoin(contribution, eq(contentReport.contributionId, contribution.id))
    .where(where)
    .orderBy(desc(contentReport.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  return {
    reports: rows.map(({ totalCount: _, ...r }) => r),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function reviewReport(
  reportId: number,
  decision: "reviewed" | "dismissed",
  reviewNote?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  await db
    .update(contentReport)
    .set({
      status: decision,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    })
    .where(eq(contentReport.id, reportId));

  await logAdminAction({
    adminUserId: session.user.id,
    action: `content_report.${decision}`,
    entityType: "content_report",
    entityId: String(reportId),
  });

  return { success: true };
}

// ==================
// Appeal Overrides
// ==================

export async function overrideAppeal(
  appealId: number,
  decision: "overturned" | "upheld",
  note?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "contributions.moderate");

  const [appeal] = await db
    .select()
    .from(contributionAppeal)
    .where(eq(contributionAppeal.id, appealId))
    .limit(1);

  if (!appeal) return { error: "Appeal not found." };

  // Update appeal
  await db
    .update(contributionAppeal)
    .set({
      status: decision,
      adminOverrideBy: session.user.id,
      adminOverrideAt: new Date(),
      adminNote: note || null,
      updatedAt: new Date(),
    })
    .where(eq(contributionAppeal.id, appealId));

  if (decision === "overturned") {
    // Reset contribution to processing, re-submit to pipeline
    await db
      .update(contribution)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(contribution.id, appeal.contributionId));

    // Re-create pipeline job for text contributions
    try {
      const [contrib] = await db
        .select({
          courseId: contribution.courseId,
          textContent: contribution.textContent,
          title: contribution.title,
        })
        .from(contribution)
        .where(eq(contribution.id, appeal.contributionId))
        .limit(1);

      if (contrib?.courseId && contrib.textContent) {
        const { detectLanguageFromText } = await import("@/lib/ai/translation");
        const { createJob } = await import("@/lib/ai/orchestrator");
        const sourceContent = `# Source: ${contrib.title}\n\n## Text Content\n\n### Page 1\n\n${contrib.textContent}`;
        const lang = detectLanguageFromText(sourceContent);

        const jobId = await createJob({
          courseId: contrib.courseId,
          contributionIds: [appeal.contributionId],
          outputTypes: (await import("@/lib/ai/types")).ALL_CONTENT_TYPES,
          startedBy: session.user.id,
          sourceContent,
          sourceLanguage: lang,
        });

        await db
          .update(contributionAppeal)
          .set({ reEvaluationJobId: jobId, updatedAt: new Date() })
          .where(eq(contributionAppeal.id, appealId));
      }
    } catch (err) {
      console.error("[admin-appeal] Failed to re-create pipeline job:", err);
    }

    // Notify user
    try {
      const { dispatchNotification } = await import("@/lib/notification-dispatch");
      await dispatchNotification(appeal.userId, {
        category: "contribution",
        title: "Appeal Overturned",
        body: note
          ? `Your appeal has been overturned by an admin: ${note}`
          : "Your appeal has been overturned by an admin. Your contribution is being re-evaluated.",
        url: "/dashboard/contribute/my",
        metadata: { contributionId: appeal.contributionId, appealId },
      });
    } catch {}
  } else {
    // Upheld — keep rejected, notify user
    try {
      const { dispatchNotification } = await import("@/lib/notification-dispatch");
      await dispatchNotification(appeal.userId, {
        category: "contribution",
        title: "Appeal Upheld",
        body: note
          ? `Your appeal was reviewed and the rejection stands: ${note}`
          : "Your appeal was reviewed and the original rejection has been upheld.",
        url: "/dashboard/contribute/my",
        metadata: { contributionId: appeal.contributionId, appealId },
      });
    } catch {}
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: `appeal.${decision}`,
    entityType: "contribution_appeal",
    entityId: String(appealId),
    details: note ? { note } : undefined,
  });

  return { success: true };
}
