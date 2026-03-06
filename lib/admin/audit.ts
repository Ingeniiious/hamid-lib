import { db } from "@/lib/db";
import { auditLog } from "@/database/schema";

export async function logAdminAction({
  adminUserId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: {
  adminUserId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLog).values({
    adminUserId,
    action,
    entityType: entityType || null,
    entityId: entityId || null,
    details: details || null,
    ipAddress: ipAddress || null,
  });
}
