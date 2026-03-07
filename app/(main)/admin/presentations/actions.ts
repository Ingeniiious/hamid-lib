"use server";

import { db } from "@/lib/db";
import { portalPresentation, portalCode } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function listPresentations({
  search,
  page = 1,
  limit = 20,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "presentations.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  // Build dynamic where clause
  const searchCondition = search
    ? sql`WHERE p.file_name ILIKE ${`%${search}%`}`
    : sql``;

  // Count total
  const countResult = await db.execute<{ count: string }>(
    sql`SELECT count(*) as count FROM portal_presentation p ${searchCondition}`
  );
  const total = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(total / safeLimit);

  // Query with join to neon_auth user and code count
  const rows = await db.execute<{
    id: number;
    userId: string;
    fileName: string;
    fileKey: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    requireApproval: boolean;
    createdAt: string;
    uploaderName: string | null;
    uploaderEmail: string | null;
    codeCount: string;
  }>(
    sql`SELECT
      p.id,
      p.user_id as "userId",
      p.file_name as "fileName",
      p.file_key as "fileKey",
      p.file_url as "fileUrl",
      p.file_size as "fileSize",
      p.file_type as "fileType",
      p.require_approval as "requireApproval",
      p.created_at as "createdAt",
      u.name as "uploaderName",
      u.email as "uploaderEmail",
      COALESCE(c.code_count, 0) as "codeCount"
    FROM portal_presentation p
    LEFT JOIN neon_auth."user" u ON u.id = p.user_id
    LEFT JOIN (
      SELECT presentation_id, count(*) as code_count
      FROM portal_code
      GROUP BY presentation_id
    ) c ON c.presentation_id = p.id
    ${searchCondition}
    ORDER BY p.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}`
  );

  return {
    presentations: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      fileName: r.fileName,
      fileKey: r.fileKey,
      fileUrl: r.fileUrl,
      fileSize: r.fileSize,
      fileType: r.fileType,
      requireApproval: r.requireApproval,
      createdAt: String(r.createdAt),
      uploaderName: r.uploaderName || "Unknown",
      uploaderEmail: r.uploaderEmail || "",
      codeCount: Number(r.codeCount),
    })),
    total,
    totalPages,
  };
}

export async function deletePresentation(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "presentations.manage");

  // Get presentation info for audit log
  const [presentation] = await db
    .select({ fileName: portalPresentation.fileName, fileKey: portalPresentation.fileKey })
    .from(portalPresentation)
    .where(eq(portalPresentation.id, id))
    .limit(1);

  if (!presentation) {
    return { error: "Presentation not found." };
  }

  // Delete from DB (cascades to portal_code)
  await db.delete(portalPresentation).where(eq(portalPresentation.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_presentation",
    entityType: "portal_presentation",
    entityId: String(id),
    details: { fileName: presentation.fileName, fileKey: presentation.fileKey },
  });

  return { success: true };
}
