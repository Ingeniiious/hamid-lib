"use server";

import { db } from "@/lib/db";
import {
  userProfile,
  calendarEvent,
  portalPresentation,
  faculty,
  program,
  contributorVerification,
} from "@/database/schema";
import { eq, sql, count } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

// ── Overview stats (single query) ──

export async function getUserStats() {
  const session = await getAdminSession();
  await requirePermission(session, "users.view");

  const [stats] = await db.execute<{
    total_users: string;
    active_today: string;
    banned_users: string;
    verified_contributors: string;
  }>(sql`
    SELECT
      (SELECT count(*) FROM neon_auth."user") as total_users,
      (SELECT count(DISTINCT session_id) FROM page_view WHERE created_at >= CURRENT_DATE) as active_today,
      (SELECT count(*) FROM neon_auth."user" WHERE banned = true) as banned_users,
      (SELECT count(*) FROM contributor_verification WHERE verified_at IS NOT NULL) as verified_contributors
  `);

  return {
    totalUsers: parseInt(stats.total_users),
    activeToday: parseInt(stats.active_today),
    bannedUsers: parseInt(stats.banned_users),
    verifiedContributors: parseInt(stats.verified_contributors),
  };
}

// ── Users (paginated, single query with window count) ──

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
  await requirePermission(session, "users.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  // Build WHERE conditions dynamically
  const conditions: ReturnType<typeof sql>[] = [];
  if (search) {
    conditions.push(sql`(u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})`);
  }
  if (university) {
    conditions.push(sql`up.university = ${university}`);
  }

  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const dataQuery = sql`
    SELECT u.id, u.name, u.email, u.image, u.banned, u."banReason", u."banExpires",
           u."createdAt", up.university, up.gender,
           count(*) OVER() as total_count
    FROM neon_auth."user" u
    LEFT JOIN user_profile up ON up.user_id = u.id::text
    ${whereClause}
    ORDER BY u."createdAt" DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `;

  const users = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    banned: boolean | null;
    banReason: string | null;
    banExpires: string | null;
    createdAt: string;
    university: string | null;
    gender: string | null;
    total_count: string;
  }>(dataQuery);

  const total = Number(users[0]?.total_count || 0);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name || "Unknown",
      email: u.email,
      image: u.image,
      banned: u.banned ?? false,
      banReason: u.banReason,
      banExpires: u.banExpires,
      createdAt: u.createdAt,
      university: u.university || "",
      gender: u.gender || "",
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

export async function getUserDetail(userId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "users.view");

  // Get user from neon_auth
  const authUsers = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    banned: boolean | null;
    banReason: string | null;
    banExpires: string | null;
    createdAt: string;
    emailVerified: boolean | null;
  }>(
    sql`SELECT id, name, email, image, banned, "banReason", "banExpires", "createdAt", "emailVerified"
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

  // Get contributor verification
  const contributorRows = await db
    .select({
      universityEmail: contributorVerification.universityEmail,
      universityName: contributorVerification.universityName,
      verifiedAt: contributorVerification.verifiedAt,
    })
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, userId))
    .limit(1);

  const contributor = contributorRows[0] || null;

  return {
    id: authUser.id,
    name: authUser.name || "Unknown",
    email: authUser.email,
    image: authUser.image,
    banned: authUser.banned ?? false,
    banReason: authUser.banReason,
    banExpires: authUser.banExpires,
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
    contributorEmail: contributor?.universityEmail || null,
    contributorUniversity: contributor?.universityName || null,
    contributorVerifiedAt: contributor?.verifiedAt?.toISOString() || null,
  };
}

export async function banUser(
  userId: string,
  reason?: string,
  expiresInDays?: number
) {
  const session = await getAdminSession();
  await requirePermission(session, "users.ban");

  const banExpires = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Ban the user + set reason/expiry
  await db.execute(
    sql`UPDATE neon_auth."user"
        SET banned = true,
            "banReason" = ${reason || null},
            "banExpires" = ${banExpires ? sql`${banExpires}::timestamp` : sql`NULL`}
        WHERE id = ${userId}`
  );

  // Revoke all active sessions immediately so the ban takes effect now
  await db.execute(
    sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`
  );

  await logAdminAction({
    adminUserId: session.user.id,
    action: "ban_user",
    entityType: "user",
    entityId: userId,
    details: { reason: reason || null, expiresInDays: expiresInDays || null },
  });

  return { success: true };
}

export async function unbanUser(userId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "users.ban");

  await db.execute(
    sql`UPDATE neon_auth."user"
        SET banned = false,
            "banReason" = NULL,
            "banExpires" = NULL
        WHERE id = ${userId}`
  );

  await logAdminAction({
    adminUserId: session.user.id,
    action: "unban_user",
    entityType: "user",
    entityId: userId,
  });

  return { success: true };
}

// ── Session management ──

export async function getUserSessions(userId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "users.view");

  return db.execute<{
    id: string;
    token: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
  }>(
    sql`SELECT id, token, "userAgent", "ipAddress", "createdAt", "expiresAt"
        FROM neon_auth.session
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC`
  );
}

export async function revokeUserSession(sessionToken: string) {
  const session = await getAdminSession();
  await requirePermission(session, "users.ban");

  await db.execute(
    sql`DELETE FROM neon_auth.session WHERE token = ${sessionToken}`
  );

  return { success: true };
}

export async function revokeAllUserSessions(userId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "users.ban");

  await db.execute(
    sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`
  );

  await logAdminAction({
    adminUserId: session.user.id,
    action: "revoke_all_sessions",
    entityType: "user",
    entityId: userId,
  });

  return { success: true };
}
