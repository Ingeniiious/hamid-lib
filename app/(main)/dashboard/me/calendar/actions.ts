"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calendarEvent } from "@/database/schema";
import { eq, and, gte } from "drizzle-orm";

async function getSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  return session;
}

export async function getCalendarEvents() {
  const session = await getSession();

  const events = await db
    .select()
    .from(calendarEvent)
    .where(eq(calendarEvent.userId, session.user.id));

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    category: e.category,
    note: e.note || undefined,
    locationType: e.locationType || undefined,
    campus: e.campus || undefined,
    room: e.room || undefined,
    url: e.url || undefined,
    alerts: e.alerts ? JSON.parse(e.alerts) : undefined,
    notify: e.notify,
    recurrence: e.recurrence || undefined,
    seriesId: e.seriesId || undefined,
  }));
}

export async function addCalendarEvents(
  events: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    category: string;
    note?: string;
    locationType?: string;
    campus?: string;
    room?: string;
    url?: string;
    alerts?: any[];
    notify?: boolean;
    recurrence?: string;
    seriesId?: string;
  }[]
) {
  const session = await getSession();

  await db.insert(calendarEvent).values(
    events.map((e) => ({
      id: e.id,
      userId: session.user.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      note: e.note || null,
      locationType: e.locationType || null,
      campus: e.campus || null,
      room: e.room || null,
      url: e.url || null,
      alerts: e.alerts ? JSON.stringify(e.alerts) : null,
      notify: e.notify ?? true,
      recurrence: e.recurrence || null,
      seriesId: e.seriesId || null,
    }))
  );

  return { success: true };
}

export async function toggleEventNotify(eventId: string, notify: boolean) {
  const session = await getSession();

  await db
    .update(calendarEvent)
    .set({ notify })
    .where(
      and(
        eq(calendarEvent.id, eventId),
        eq(calendarEvent.userId, session.user.id)
      )
    );

  return { success: true };
}

export async function updateCalendarEvent(
  eventId: string,
  data: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    category: string;
    note?: string;
    locationType?: string;
    campus?: string;
    room?: string;
    url?: string;
    alerts?: any[];
    notify?: boolean;
  }
) {
  const session = await getSession();

  await db
    .update(calendarEvent)
    .set({
      title: data.title,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      category: data.category,
      note: data.note || null,
      locationType: data.locationType || null,
      campus: data.campus || null,
      room: data.room || null,
      url: data.url || null,
      alerts: data.alerts ? JSON.stringify(data.alerts) : null,
      notify: data.notify ?? true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendarEvent.id, eventId),
        eq(calendarEvent.userId, session.user.id)
      )
    );

  return { success: true };
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await getSession();

  await db
    .delete(calendarEvent)
    .where(
      and(
        eq(calendarEvent.id, eventId),
        eq(calendarEvent.userId, session.user.id)
      )
    );

  return { success: true };
}

export async function deleteSeriesFromDate(seriesId: string, fromDate: string) {
  const session = await getSession();

  await db
    .delete(calendarEvent)
    .where(
      and(
        eq(calendarEvent.seriesId, seriesId),
        eq(calendarEvent.userId, session.user.id),
        gte(calendarEvent.date, fromDate)
      )
    );

  return { success: true };
}
