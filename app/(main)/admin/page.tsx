import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/admin/auth";
import {
  course,
  portalPresentation,
  pageView,
  auditLog,
} from "@/database/schema";
import { sql, eq, desc } from "drizzle-orm";
import { AdminOverviewClient } from "./AdminOverviewClient";

export default async function AdminOverviewPage() {
  const session = await getAdminSession();

  // Fetch stats in parallel
  const [userCount, activeToday, courseCount, presentationCount, recentAudit] =
    await Promise.all([
      db
        .execute<{ count: string }>(
          sql`SELECT count(*)::text as count FROM neon_auth."user"`
        )
        .then((r) => Number(r[0]?.count || 0)),
      db
        .select({ count: sql<string>`count(DISTINCT ${pageView.sessionId})` })
        .from(pageView)
        .where(sql`${pageView.createdAt} >= CURRENT_DATE`)
        .then((r) => Number(r[0]?.count || 0)),
      db
        .select({ count: sql<string>`count(*)` })
        .from(course)
        .then((r) => Number(r[0]?.count || 0)),
      db
        .select({ count: sql<string>`count(*)` })
        .from(portalPresentation)
        .then((r) => Number(r[0]?.count || 0)),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          createdAt: auditLog.createdAt,
          adminUserId: auditLog.adminUserId,
        })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(10),
    ]);

  return (
    <AdminOverviewClient
      stats={{
        totalUsers: userCount,
        activeToday,
        totalCourses: courseCount,
        totalPresentations: presentationCount,
      }}
      recentAudit={recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
