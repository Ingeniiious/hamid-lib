"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { adminUser, adminRole, adminInvite } from "@/database/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email";

export async function getAdminTeam() {
  const session = await getAdminSession();
  requirePermission(session, "team.view");

  const rows = await db
    .select({
      userId: adminUser.userId,
      roleId: adminUser.roleId,
      roleName: adminRole.name,
      roleSlug: adminRole.slug,
      createdAt: adminUser.createdAt,
      otpVerifiedAt: adminUser.otpVerifiedAt,
    })
    .from(adminUser)
    .innerJoin(adminRole, eq(adminUser.roleId, adminRole.id))
    .orderBy(desc(adminUser.createdAt));

  // Fetch user details from neon_auth
  const userIds = rows.map((r) => r.userId);
  if (userIds.length === 0) return [];

  const users = await db.execute<{ id: string; name: string; email: string; image: string | null }>(
    sql`SELECT id, name, email, image FROM neon_auth."user" WHERE id = ANY(${userIds})`
  );

  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    userId: r.userId,
    name: userMap.get(r.userId)?.name || "Unknown",
    email: userMap.get(r.userId)?.email || "",
    image: userMap.get(r.userId)?.image || null,
    roleName: r.roleName,
    roleSlug: r.roleSlug,
    roleId: r.roleId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function inviteAdmin(email: string, roleId: number) {
  const session = await getAdminSession();
  requirePermission(session, "team.manage");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(adminInvite).values({
    email,
    roleId,
    token,
    invitedBy: session.user.id,
    expiresAt,
  });

  // Send invite email
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://libraryyy.com"}/admin/invite?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Admin Invite — Libraryyy",
    html: `<p>You've been invited to join the Libraryyy admin panel.</p><p><a href="${inviteUrl}">Accept Invite</a></p><p>This invite expires in 7 days.</p>`,
    text: `You've been invited to the Libraryyy admin panel. Accept here: ${inviteUrl}`,
  });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "invite_admin",
    entityType: "admin_invite",
    details: { email, roleId },
  });

  return { success: true };
}

export async function removeAdmin(userId: string) {
  const session = await getAdminSession();
  requirePermission(session, "team.manage");

  if (userId === session.user.id) {
    return { error: "Cannot remove yourself." };
  }

  // Prevent removing last super-admin
  const superAdminRole = await db
    .select({ id: adminRole.id })
    .from(adminRole)
    .where(eq(adminRole.slug, "super-admin"))
    .limit(1);

  if (superAdminRole[0]) {
    const targetAdmin = await db
      .select({ roleId: adminUser.roleId })
      .from(adminUser)
      .where(eq(adminUser.userId, userId))
      .limit(1);

    if (targetAdmin[0]?.roleId === superAdminRole[0].id) {
      const superAdminCount = await db
        .select({ count: sql<string>`count(*)` })
        .from(adminUser)
        .where(eq(adminUser.roleId, superAdminRole[0].id));

      if (Number(superAdminCount[0]?.count || 0) <= 1) {
        return { error: "Cannot remove the last super admin." };
      }
    }
  }

  await db.delete(adminUser).where(eq(adminUser.userId, userId));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "remove_admin",
    entityType: "admin_user",
    entityId: userId,
  });

  return { success: true };
}

export async function changeAdminRole(userId: string, roleId: number) {
  const session = await getAdminSession();
  requirePermission(session, "team.manage");

  await db
    .update(adminUser)
    .set({ roleId, updatedAt: new Date() })
    .where(eq(adminUser.userId, userId));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "change_admin_role",
    entityType: "admin_user",
    entityId: userId,
    details: { newRoleId: roleId },
  });

  return { success: true };
}
