"use server";

import { db } from "@/lib/db";
import { calendarEvent } from "@/database/schema";
import { sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";

export async function getAllCalendarEvents({
  userId,
  dateFrom,
  dateTo,
  category,
  page = 1,
  limit = 20,
}: {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  requirePermission(session, "calendar.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  // Build dynamic conditions
  const conditions: ReturnType<typeof sql>[] = [];

  if (userId) {
    conditions.push(sql`e.user_id = ${userId}`);
  }
  if (dateFrom) {
    conditions.push(sql`e.date >= ${dateFrom}`);
  }
  if (dateTo) {
    conditions.push(sql`e.date <= ${dateTo}`);
  }
  if (category) {
    conditions.push(sql`e.category = ${category}`);
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  // Count total
  const countResult = await db.execute<{ count: string }>(
    sql`SELECT count(*) as count FROM calendar_event e ${whereClause}`
  );
  const total = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(total / safeLimit);

  // Query with join to neon_auth user
  const rows = await db.execute<{
    id: string;
    userId: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    category: string;
    note: string | null;
    recurrence: string | null;
    seriesId: string | null;
    userName: string | null;
    userEmail: string | null;
    createdAt: string;
  }>(
    sql`SELECT
      e.id,
      e.user_id as "userId",
      e.title,
      e.date,
      e.start_time as "startTime",
      e.end_time as "endTime",
      e.category,
      e.note,
      e.recurrence,
      e.series_id as "seriesId",
      u.name as "userName",
      u.email as "userEmail",
      e.created_at as "createdAt"
    FROM calendar_event e
    LEFT JOIN neon_auth."user" u ON u.id = e.user_id
    ${whereClause}
    ORDER BY e.date DESC, e.start_time DESC
    LIMIT ${safeLimit} OFFSET ${offset}`
  );

  return {
    events: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      category: r.category,
      note: r.note,
      recurrence: r.recurrence || "none",
      seriesId: r.seriesId,
      userName: r.userName || "Unknown",
      userEmail: r.userEmail || "",
      createdAt: String(r.createdAt),
    })),
    total,
    totalPages,
  };
}
