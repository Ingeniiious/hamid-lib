"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";

export async function getCalendarStats() {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.view");

  const today = new Date().toISOString().slice(0, 10);

  const [stats] = await db.execute<{
    total_series: string;
    total_individual: string;
    events_today: string;
    unique_users: string;
    active_recurring: string;
  }>(sql`
    SELECT
      (SELECT count(DISTINCT COALESCE(series_id, id)) FROM calendar_event) as total_series,
      (SELECT count(*) FROM calendar_event) as total_individual,
      (SELECT count(*) FROM calendar_event WHERE date = ${today}) as events_today,
      (SELECT count(DISTINCT user_id) FROM calendar_event) as unique_users,
      (SELECT count(DISTINCT series_id) FROM calendar_event WHERE series_id IS NOT NULL AND recurrence != 'none') as active_recurring
  `);

  return {
    totalSeries: parseInt(stats.total_series),
    totalIndividual: parseInt(stats.total_individual),
    eventsToday: parseInt(stats.events_today),
    uniqueUsers: parseInt(stats.unique_users),
    activeRecurring: parseInt(stats.active_recurring),
  };
}

export async function listCalendarSeries({
  search,
  category,
  page = 1,
  limit = 25,
}: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.view");

  const offset = (page - 1) * limit;

  // Build WHERE conditions for the inner query
  const conditions: ReturnType<typeof sql>[] = [];
  if (category) {
    conditions.push(sql`e.category = ${category}`);
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(e.title ILIKE ${pattern} OR u.name ILIKE ${pattern} OR u.email ILIKE ${pattern})`
    );
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const rows = await db.execute<{
    groupId: string;
    title: string;
    userId: string;
    category: string;
    startTime: string;
    endTime: string;
    recurrence: string | null;
    note: string | null;
    firstDate: string;
    lastDate: string;
    occurrences: string;
    userName: string | null;
    userEmail: string | null;
    totalCount: string;
  }>(sql`
    SELECT
      g."groupId",
      g.title,
      g."userId",
      g.category,
      g."startTime",
      g."endTime",
      g.recurrence,
      g.note,
      g."firstDate",
      g."lastDate",
      g.occurrences,
      g."userName",
      g."userEmail",
      count(*) OVER() as "totalCount"
    FROM (
      SELECT
        COALESCE(e.series_id, e.id) as "groupId",
        e.title,
        e.user_id as "userId",
        e.category,
        e.start_time as "startTime",
        e.end_time as "endTime",
        e.recurrence,
        e.note,
        min(e.date) as "firstDate",
        max(e.date) as "lastDate",
        count(*)::text as occurrences,
        u.name as "userName",
        u.email as "userEmail"
      FROM calendar_event e
      LEFT JOIN neon_auth."user" u ON u.id::text = e.user_id
      ${whereClause}
      GROUP BY COALESCE(e.series_id, e.id), e.title, e.user_id, e.category,
               e.start_time, e.end_time, e.recurrence, e.note, u.name, u.email
    ) g
    ORDER BY g."firstDate" DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const total = Number(rows[0]?.totalCount ?? 0);

  return {
    series: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      occurrences: parseInt(r.occurrences),
      userName: r.userName || "Unknown",
      userEmail: r.userEmail || "",
      recurrence: r.recurrence || "none",
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}
