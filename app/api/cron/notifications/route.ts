import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvent, pushSubscription, notificationLog } from "@/database/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendPushNotification } from "@/lib/web-push";

// Vercel Cron runs every minute — protected by CRON_SECRET
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Current time in Europe/Istanbul (UTC+3)
  const now = new Date();
  const istanbulOffset = 3 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istanbulMinutes = utcMinutes + istanbulOffset;
  const istanbulHours = Math.floor(((istanbulMinutes % 1440) + 1440) % 1440 / 60);
  const istanbulMins = ((istanbulMinutes % 1440) + 1440) % 1440 % 60;

  // Calculate Istanbul date
  const istanbulDate = new Date(now);
  istanbulDate.setUTCMinutes(istanbulDate.getUTCMinutes() + istanbulOffset);
  const todayStr = istanbulDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Current time in minutes since midnight (Istanbul)
  const currentMinutes = istanbulHours * 60 + istanbulMins;

  // Fetch today's events that have alerts and notifications enabled
  const events = await db
    .select()
    .from(calendarEvent)
    .where(
      and(
        eq(calendarEvent.date, todayStr),
        eq(calendarEvent.notify, true),
        sql`${calendarEvent.alerts} IS NOT NULL AND ${calendarEvent.alerts} != 'null'`
      )
    );

  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    let alerts;
    try {
      alerts = JSON.parse(event.alerts!);
    } catch {
      continue;
    }
    if (!Array.isArray(alerts)) continue;

    const eventStartMinutes = timeToMinutes(event.startTime);

    for (const alert of alerts) {
      const alertMinutes = typeof alert === "object" ? alert.minutes : alert;
      if (alertMinutes < 0) continue;

      const travelMinutes = typeof alert === "object" ? (alert.travelMinutes || 0) : 0;
      const notifyAtMinutes = eventStartMinutes - alertMinutes - travelMinutes;

      // 90-second lookback window to absorb cron drift
      // (1.5 minutes = check if notify time falls within [currentMinutes - 1.5, currentMinutes])
      if (notifyAtMinutes > currentMinutes || notifyAtMinutes < currentMinutes - 1.5) {
        continue;
      }

      // Check if already sent
      const existing = await db
        .select({ id: notificationLog.id })
        .from(notificationLog)
        .where(
          and(
            eq(notificationLog.eventId, event.id),
            eq(notificationLog.alertMinutes, alertMinutes)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Get user's push subscriptions
      const subscriptions = await db
        .select()
        .from(pushSubscription)
        .where(eq(pushSubscription.userId, event.userId));

      if (subscriptions.length === 0) continue;

      // Build notification payload
      const body = alertMinutes === 0
        ? `Starting now — ${event.startTime}`
        : `In ${formatMinutes(alertMinutes + travelMinutes)} — ${event.startTime}`;

      const payload = {
        title: event.title,
        body,
        url: "/dashboard/me/calendar",
        tag: `event-${event.id}-${alertMinutes}`,
        category: event.category,
      };

      // Send to all devices in parallel (batches of 50)
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh!, auth: sub.auth! },
            payload
          ).then(async (result) => {
            // Auto-delete expired subscriptions (410 Gone)
            if (!result.success && result.statusCode === 410) {
              await db
                .delete(pushSubscription)
                .where(eq(pushSubscription.id, sub.id));
            }
            return result;
          })
        )
      );

      // Log the notification to prevent duplicates
      await db.insert(notificationLog).values({
        eventId: event.id,
        alertMinutes,
      });

      sent++;
    }
  }

  return NextResponse.json({
    ok: true,
    date: todayStr,
    time: `${String(istanbulHours).padStart(2, "0")}:${String(istanbulMins).padStart(2, "0")}`,
    eventsChecked: events.length,
    sent,
    skipped,
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${h}h ${m}m`;
}
