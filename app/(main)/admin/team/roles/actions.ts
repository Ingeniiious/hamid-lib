"use server";

import { db } from "@/lib/db";
import { adminRole, adminUser } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function getRoles() {
  const session = await getAdminSession();
  await requirePermission(session, "team.view");

  const rows = await db
    .select({
      id: adminRole.id,
      name: adminRole.name,
      slug: adminRole.slug,
      permissions: adminRole.permissions,
      description: adminRole.description,
    })
    .from(adminRole);

  return rows;
}

export async function createRole(
  name: string,
  slug: string,
  permissions: string[],
  description?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "team.manage");

  const [row] = await db
    .insert(adminRole)
    .values({ name, slug, permissions, description: description || null })
    .returning({ id: adminRole.id });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "create_role",
    entityType: "admin_role",
    entityId: String(row.id),
    details: { name, permissions },
  });

  return { success: true, id: row.id };
}

export async function updateRole(
  id: number,
  permissions: string[],
  name?: string,
  description?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "team.manage");

  const updates: Record<string, unknown> = { permissions };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;

  await db.update(adminRole).set(updates).where(eq(adminRole.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "update_role",
    entityType: "admin_role",
    entityId: String(id),
    details: { permissions },
  });

  return { success: true };
}

export async function deleteRole(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "team.manage");

  // Check if any admin users have this role
  const usersWithRole = await db
    .select({ count: sql<string>`count(*)` })
    .from(adminUser)
    .where(eq(adminUser.roleId, id));

  if (Number(usersWithRole[0]?.count || 0) > 0) {
    return { error: "Cannot delete role with active users." };
  }

  await db.delete(adminRole).where(eq(adminRole.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_role",
    entityType: "admin_role",
    entityId: String(id),
  });

  return { success: true };
}
