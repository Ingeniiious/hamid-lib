"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { calendarEvent } from "@/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSeriesDetail(groupId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.view");

  // Fetch all events belonging to this group (series_id = groupId OR single id = groupId)
  const events = await db.execute<{
    id: string;
    userId: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    category: string;
    note: string | null;
    locationType: string | null;
    campus: string | null;
    room: string | null;
    url: string | null;
    recurrence: string | null;
    seriesId: string | null;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
  }>(sql`
    SELECT
      e.id,
      e.user_id as "userId",
      e.title,
      e.date,
      e.start_time as "startTime",
      e.end_time as "endTime",
      e.category,
      e.note,
      e.location_type as "locationType",
      e.campus,
      e.room,
      e.url,
      e.recurrence,
      e.series_id as "seriesId",
      e.created_at as "createdAt",
      u.name as "userName",
      u.email as "userEmail"
    FROM calendar_event e
    LEFT JOIN neon_auth."user" u ON u.id::text = e.user_id
    WHERE e.series_id = ${groupId} OR (e.id = ${groupId} AND e.series_id IS NULL)
    ORDER BY e.date ASC
  `);

  if (events.length === 0) return null;

  const first = events[0];
  return {
    groupId,
    title: first.title,
    category: first.category,
    startTime: first.startTime,
    endTime: first.endTime,
    recurrence: first.recurrence || "none",
    note: first.note,
    locationType: first.locationType,
    campus: first.campus,
    room: first.room,
    url: first.url,
    userName: first.userName || "Unknown",
    userEmail: first.userEmail || "",
    userId: first.userId,
    isSeries: events.length > 1 || first.seriesId !== null,
    events: events.map((e) => ({
      id: e.id,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      createdAt: e.createdAt,
    })),
  };
}

export type SeriesDetail = NonNullable<Awaited<ReturnType<typeof getSeriesDetail>>>;

export async function updateCalendarSeries(
  groupId: string,
  data: {
    title?: string;
    startTime?: string;
    endTime?: string;
    category?: string;
    note?: string | null;
  }
) {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.manage");

  const setClauses: ReturnType<typeof sql>[] = [];
  if (data.title !== undefined) setClauses.push(sql`title = ${data.title}`);
  if (data.startTime !== undefined) setClauses.push(sql`start_time = ${data.startTime}`);
  if (data.endTime !== undefined) setClauses.push(sql`end_time = ${data.endTime}`);
  if (data.category !== undefined) setClauses.push(sql`category = ${data.category}`);
  if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
  setClauses.push(sql`updated_at = now()`);

  if (setClauses.length === 1) return; // only updated_at

  await db.execute(sql`
    UPDATE calendar_event
    SET ${sql.join(setClauses, sql`, `)}
    WHERE series_id = ${groupId} OR (id = ${groupId} AND series_id IS NULL)
  `);

  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/calendar/${groupId}`);
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.manage");

  await db.delete(calendarEvent).where(eq(calendarEvent.id, eventId));

  revalidatePath("/admin/calendar");
}

export async function deleteCalendarSeries(groupId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "calendar.manage");

  // Delete all events in this series (or the single event)
  await db.execute(sql`
    DELETE FROM calendar_event
    WHERE series_id = ${groupId} OR (id = ${groupId} AND series_id IS NULL)
  `);

  revalidatePath("/admin/calendar");
}
