"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUser, adminRole } from "@/database/schema";
import { eq } from "drizzle-orm";
import type { Permission } from "./permissions";

export interface AdminSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  admin: {
    roleId: number;
    roleName: string;
    roleSlug: string;
    permissions: string[];
    otpVerifiedAt: Date | null;
  };
}

export async function getAdminSession(): Promise<AdminSession> {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");

  const rows = await db
    .select({
      roleId: adminUser.roleId,
      roleName: adminRole.name,
      roleSlug: adminRole.slug,
      permissions: adminRole.permissions,
      otpVerifiedAt: adminUser.otpVerifiedAt,
    })
    .from(adminUser)
    .innerJoin(adminRole, eq(adminUser.roleId, adminRole.id))
    .where(eq(adminUser.userId, session.user.id))
    .limit(1);

  if (!rows[0]) redirect("/dashboard");

  const admin = rows[0];

  // Check OTP verification (24h window)
  const otpExpiry = admin.otpVerifiedAt
    ? new Date(admin.otpVerifiedAt.getTime() + 24 * 60 * 60 * 1000)
    : null;
  const otpValid = otpExpiry && otpExpiry > new Date();

  if (!otpValid) redirect("/auth");

  return {
    user: {
      id: session.user.id,
      name: session.user.name || "Admin",
      email: session.user.email || "",
      image: session.user.image,
    },
    admin: {
      roleId: admin.roleId,
      roleName: admin.roleName,
      roleSlug: admin.roleSlug,
      permissions: admin.permissions,
      otpVerifiedAt: admin.otpVerifiedAt,
    },
  };
}

export async function getAdminSessionForVerify() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");

  const rows = await db
    .select({
      roleId: adminUser.roleId,
      roleName: adminRole.name,
      roleSlug: adminRole.slug,
      permissions: adminRole.permissions,
    })
    .from(adminUser)
    .innerJoin(adminRole, eq(adminUser.roleId, adminRole.id))
    .where(eq(adminUser.userId, session.user.id))
    .limit(1);

  if (!rows[0]) redirect("/dashboard");

  return {
    user: {
      id: session.user.id,
      name: session.user.name || "Admin",
      email: session.user.email || "",
    },
  };
}

/**
 * Non-redirecting admin session check for API route handlers.
 * Returns the session or null (route handlers can't use redirect()).
 */
export async function getAdminSessionForAPI(): Promise<AdminSession | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const rows = await db
    .select({
      roleId: adminUser.roleId,
      roleName: adminRole.name,
      roleSlug: adminRole.slug,
      permissions: adminRole.permissions,
      otpVerifiedAt: adminUser.otpVerifiedAt,
    })
    .from(adminUser)
    .innerJoin(adminRole, eq(adminUser.roleId, adminRole.id))
    .where(eq(adminUser.userId, session.user.id))
    .limit(1);

  if (!rows[0]) return null;

  const admin = rows[0];
  const otpExpiry = admin.otpVerifiedAt
    ? new Date(admin.otpVerifiedAt.getTime() + 24 * 60 * 60 * 1000)
    : null;
  if (!otpExpiry || otpExpiry <= new Date()) return null;

  return {
    user: {
      id: session.user.id,
      name: session.user.name || "Admin",
      email: session.user.email || "",
      image: session.user.image,
    },
    admin: {
      roleId: admin.roleId,
      roleName: admin.roleName,
      roleSlug: admin.roleSlug,
      permissions: admin.permissions,
      otpVerifiedAt: admin.otpVerifiedAt,
    },
  };
}

export async function hasPermission(session: AdminSession, permission: Permission): Promise<boolean> {
  return session.admin.permissions.includes(permission);
}

export async function requirePermission(session: AdminSession, permission: Permission): Promise<void> {
  if (!(await hasPermission(session, permission))) {
    redirect("/admin?error=forbidden");
  }
}
