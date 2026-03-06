"use server";

import { db } from "@/lib/db";
import {
  userProfile,
  calendarEvent,
  portalPresentation,
  faculty,
  program,
} from "@/database/schema";
import { eq, sql, count } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

interface ListUsersParams {
  search?: string;
  university?: string;
  page?: number;
  limit?: number;
}

export async function listUsers({
  search,
  university,
  page = 1,
  limit = 20,
}: ListUsersParams = {}) {
  const session = await getAdminSession();
  requirePermission(session, "users.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  // Build parameterized count query
  const countQuery =
    search && university
      ? sql`SELECT COUNT(*) as total FROM neon_auth."user" u LEFT JOIN user_profile up ON up.user_id = u.id::text WHERE (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`}) AND up.university = ${university}`
      : search
        ? sql`SELECT COUNT(*) as total FROM neon_auth."user" u LEFT JOIN user_profile up ON up.user_id = u.id::text WHERE (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})`
        : university
          ? sql`SELECT COUNT(*) as total FROM neon_auth."user" u LEFT JOIN user_profile up ON up.user_id = u.id::text WHERE up.university = ${university}`
          : sql`SELECT COUNT(*) as total FROM neon_auth."user" u LEFT JOIN user_profile up ON up.user_id = u.id::text`;

  const countRows = await db.execute<{ total: string }>(countQuery);
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.ceil(total / safeLimit);

  // Build parameterized data query
  const dataQuery =
    search && university
      ? sql`SELECT u.id, u.name, u.email, u.image, u.banned, u."createdAt", up.university, up.gender
            FROM neon_auth."user" u
            LEFT JOIN user_profile up ON up.user_id = u.id::text
            WHERE (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`}) AND up.university = ${university}
            ORDER BY u."createdAt" DESC
            LIMIT ${safeLimit} OFFSET ${offset}`
      : search
        ? sql`SELECT u.id, u.name, u.email, u.image, u.banned, u."createdAt", up.university, up.gender
              FROM neon_auth."user" u
              LEFT JOIN user_profile up ON up.user_id = u.id::text
              WHERE (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
              ORDER BY u."createdAt" DESC
              LIMIT ${safeLimit} OFFSET ${offset}`
        : university
          ? sql`SELECT u.id, u.name, u.email, u.image, u.banned, u."createdAt", up.university, up.gender
                FROM neon_auth."user" u
                LEFT JOIN user_profile up ON up.user_id = u.id::text
                WHERE up.university = ${university}
                ORDER BY u."createdAt" DESC
                LIMIT ${safeLimit} OFFSET ${offset}`
          : sql`SELECT u.id, u.name, u.email, u.image, u.banned, u."createdAt", up.university, up.gender
                FROM neon_auth."user" u
                LEFT JOIN user_profile up ON up.user_id = u.id::text
                ORDER BY u."createdAt" DESC
                LIMIT ${safeLimit} OFFSET ${offset}`;

  const users = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    banned: boolean | null;
    createdAt: string;
    university: string | null;
    gender: string | null;
  }>(dataQuery);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name || "Unknown",
      email: u.email,
      image: u.image,
      banned: u.banned ?? false,
      createdAt: u.createdAt,
      university: u.university || "",
      gender: u.gender || "",
    })),
    total,
    totalPages,
  };
}

export async function getUserDetail(userId: string) {
  const session = await getAdminSession();
  requirePermission(session, "users.view");

  // Get user from neon_auth
  const authUsers = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    banned: boolean | null;
    createdAt: string;
    emailVerified: boolean | null;
  }>(
    sql`SELECT id, name, email, image, banned, "createdAt", "emailVerified"
        FROM neon_auth."user"
        WHERE id = ${userId}`
  );

  if (!authUsers[0]) return null;

  const authUser = authUsers[0];

  // Get profile with faculty and program names
  const profileRows = await db
    .select({
      university: userProfile.university,
      gender: userProfile.gender,
      avatarUrl: userProfile.avatarUrl,
      facultyId: userProfile.facultyId,
      programId: userProfile.programId,
      facultyName: faculty.name,
      programName: program.name,
    })
    .from(userProfile)
    .leftJoin(faculty, eq(userProfile.facultyId, faculty.id))
    .leftJoin(program, eq(userProfile.programId, program.id))
    .where(eq(userProfile.userId, userId))
    .limit(1);

  const profile = profileRows[0] || null;

  // Get counts
  const [eventsCount] = await db
    .select({ count: count() })
    .from(calendarEvent)
    .where(eq(calendarEvent.userId, userId));

  const [presentationsCount] = await db
    .select({ count: count() })
    .from(portalPresentation)
    .where(eq(portalPresentation.userId, userId));

  return {
    id: authUser.id,
    name: authUser.name || "Unknown",
    email: authUser.email,
    image: authUser.image,
    banned: authUser.banned ?? false,
    emailVerified: authUser.emailVerified ?? false,
    createdAt: authUser.createdAt,
    university: profile?.university || "",
    gender: profile?.gender || "",
    avatarUrl: profile?.avatarUrl || null,
    facultyId: profile?.facultyId || null,
    programId: profile?.programId || null,
    facultyName: profile?.facultyName || "",
    programName: profile?.programName || "",
    calendarEventsCount: eventsCount?.count || 0,
    presentationsCount: presentationsCount?.count || 0,
  };
}

export async function banUser(userId: string) {
  const session = await getAdminSession();
  requirePermission(session, "users.ban");

  await db.execute(
    sql`UPDATE neon_auth."user" SET banned = true WHERE id = ${userId}`
  );

  await logAdminAction({
    adminUserId: session.user.id,
    action: "ban_user",
    entityType: "user",
    entityId: userId,
  });

  return { success: true };
}

export async function unbanUser(userId: string) {
  const session = await getAdminSession();
  requirePermission(session, "users.ban");

  await db.execute(
    sql`UPDATE neon_auth."user" SET banned = false WHERE id = ${userId}`
  );

  await logAdminAction({
    adminUserId: session.user.id,
    action: "unban_user",
    entityType: "user",
    entityId: userId,
  });

  return { success: true };
}
