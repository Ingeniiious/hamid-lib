"use server";

import { db } from "@/lib/db";
import { auditLog } from "@/database/schema";
import { sql, desc, eq, gte, lte, and } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";

export async function getAuditLogs({
  adminUserId,
  action,
  entityType,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20,
}: {
  adminUserId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  requirePermission(session, "audit.view");

  const conditions = [];
  if (adminUserId) conditions.push(eq(auditLog.adminUserId, adminUserId));
  if (action) conditions.push(sql`${auditLog.action} ILIKE ${`%${action}%`}`);
  if (entityType) conditions.push(eq(auditLog.entityType, entityType));
  if (dateFrom) conditions.push(gte(auditLog.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(auditLog.createdAt, new Date(dateTo)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const [logs, countResult] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        adminUserId: auditLog.adminUserId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        details: auditLog.details,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(safeLimit)
      .offset((page - 1) * safeLimit),
    db
      .select({ count: sql<string>`count(*)` })
      .from(auditLog)
      .where(where),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // Fetch admin names
  const adminIds = [...new Set(logs.map((l) => l.adminUserId))];
  let adminMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const admins = await db.execute<{ id: string; name: string }>(
      sql`SELECT id, name FROM neon_auth."user" WHERE id = ANY(${adminIds})`
    );
    adminMap = new Map(admins.map((a) => [a.id, a.name]));
  }

  return {
    logs: logs.map((l) => ({
      id: l.id,
      adminName: adminMap.get(l.adminUserId) || "Unknown",
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}
