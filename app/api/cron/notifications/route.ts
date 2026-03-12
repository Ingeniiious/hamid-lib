import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calendarEvent,
  pushSubscription,
  notificationLog,
  notificationAutomation,
  notificationAutomationLog,
  notificationTemplate,
  userProfile,
  task,
} from "@/database/schema";
import { eq, and, ne, sql, inArray } from "drizzle-orm";
import { sqlInList } from "@/lib/db";
import { sendPushNotification } from "@/lib/web-push";
import { processScheduledCampaigns } from "@/lib/campaign-scheduler";
import { processAutomations } from "@/lib/notification-engine";

const DEFAULT_TZ = "Europe/Istanbul";

// ── Timezone helper ──────────────────────────────────────────
// Uses Intl API — works on all JS runtimes, no libraries needed.

function getLocalDateTime(
  now: Date,
  timezone: string
): { localDate: string; localHours: number; localMinutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "0";

    return {
      localDate: `${get("year")}-${get("month")}-${get("day")}`,
      localHours: parseInt(get("hour")),
      localMinutes: parseInt(get("hour")) * 60 + parseInt(get("minute")),
    };
  } catch {
    // Invalid timezone — fall back to Istanbul
    return getLocalDateTime(now, DEFAULT_TZ);
  }
}

// Vercel Cron runs every minute — protected by CRON_SECRET
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── 1. Calendar event alerts (timezone-aware) ───────────────
  // Query events for today ± 1 day to cover all timezones (UTC-12 to UTC+14)
  const utcDate = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  const events = await db
    .select()
    .from(calendarEvent)
    .where(
      and(
        inArray(calendarEvent.date, [yesterday, utcDate, tomorrow]),
        eq(calendarEvent.notify, true),
        sql`${calendarEvent.alerts} IS NOT NULL AND ${calendarEvent.alerts} != 'null'`
      )
    );

  // Build timezone map for all event owners
  const eventUserIds = [...new Set(events.map((e) => e.userId))];
  const userTzMap = new Map<string, string>();

  if (eventUserIds.length > 0) {
    const profiles = await db
      .select({ userId: userProfile.userId, timezone: userProfile.timezone })
      .from(userProfile)
      .where(inArray(userProfile.userId, eventUserIds));

    for (const p of profiles) {
      userTzMap.set(p.userId, p.timezone || DEFAULT_TZ);
    }
  }

  // ── Batch-load push subscriptions for all event owners (eliminates N+1) ──
  const subsMap = new Map<string, typeof pushSubscription.$inferSelect[]>();
  if (eventUserIds.length > 0) {
    const allSubs = await db
      .select()
      .from(pushSubscription)
      .where(inArray(pushSubscription.userId, eventUserIds));
    for (const sub of allSubs) {
      const list = subsMap.get(sub.userId) || [];
      list.push(sub);
      subsMap.set(sub.userId, list);
    }
  }

  // ── Batch-load existing notification logs for these events (eliminates N+1) ──
  const eventIds = events.map((e) => e.id);
  const sentLogsSet = new Set<string>();
  if (eventIds.length > 0) {
    const existingLogs = await db
      .select({
        eventId: notificationLog.eventId,
        alertMinutes: notificationLog.alertMinutes,
      })
      .from(notificationLog)
      .where(inArray(notificationLog.eventId, eventIds));
    for (const log of existingLogs) {
      sentLogsSet.add(`${log.eventId}:${log.alertMinutes}`);
    }
  }

  let sent = 0;
  let skipped = 0;
  const expiredSubIds: number[] = [];

  // ── Build list of notifications to send ──
  type PendingAlert = {
    event: typeof events[number];
    alertMinutes: number;
    travelMinutes: number;
  };
  const pendingAlerts: PendingAlert[] = [];

  for (const event of events) {
    const tz = userTzMap.get(event.userId) || DEFAULT_TZ;
    const { localDate, localMinutes: currentMinutes } = getLocalDateTime(
      now,
      tz
    );

    if (event.date !== localDate) continue;

    let alerts;
    try {
      alerts = JSON.parse(event.alerts!);
    } catch {
      continue;
    }
    if (!Array.isArray(alerts)) continue;

    const eventStartMinutes = timeToMinutes(event.startTime);

    for (const alert of alerts) {
      const alertMinutes =
        typeof alert === "object" ? alert.minutes : alert;
      if (alertMinutes < 0) continue;

      const travelMinutes =
        typeof alert === "object" ? alert.travelMinutes || 0 : 0;
      const notifyAtMinutes =
        eventStartMinutes - alertMinutes - travelMinutes;

      // 90-second lookback window to absorb cron drift
      if (
        notifyAtMinutes > currentMinutes ||
        notifyAtMinutes < currentMinutes - 1.5
      ) {
        continue;
      }

      // Check in-memory dedup (from batch-loaded logs)
      if (sentLogsSet.has(`${event.id}:${alertMinutes}`)) {
        skipped++;
        continue;
      }

      const subscriptions = subsMap.get(event.userId);
      if (!subscriptions || subscriptions.length === 0) continue;

      pendingAlerts.push({ event, alertMinutes, travelMinutes });
    }
  }

  // ── Claim-first dedup: INSERT ON CONFLICT DO NOTHING, then send ──
  for (const { event, alertMinutes, travelMinutes } of pendingAlerts) {
    // Atomic claim — if another cron run already claimed this, the INSERT
    // returns nothing and we skip. No race condition possible.
    const claimed = await db
      .insert(notificationLog)
      .values({ eventId: event.id, alertMinutes })
      .onConflictDoNothing()
      .returning({ id: notificationLog.id });

    if (claimed.length === 0) {
      skipped++;
      continue;
    }

    const subscriptions = subsMap.get(event.userId)!;

    // Build location context for the notification body
    const locationParts: string[] = [];
    if (event.locationType === "online" && event.url) {
      locationParts.push("Online");
    } else {
      if (event.campus) locationParts.push(event.campus);
      if (event.room) locationParts.push(event.room);
    }
    const locationStr = locationParts.length > 0 ? ` — ${locationParts.join(", ")}` : "";

    const body =
      alertMinutes === 0
        ? `Starting now — ${event.startTime}${locationStr}`
        : `In ${formatMinutes(alertMinutes + travelMinutes)} — ${event.startTime}${locationStr}`;

    // Category label for notification title (e.g., "Class: Math 101")
    const categoryLabels: Record<string, string> = {
      class: "Class",
      exam: "Exam",
      deadline: "Deadline",
      reminder: "Reminder",
    };
    const categoryLabel = categoryLabels[event.category] || "";
    const title = categoryLabel ? `${categoryLabel}: ${event.title}` : event.title;

    // For online events, tapping the notification opens the meeting URL directly
    const notifUrl = event.locationType === "online" && event.url
      ? event.url
      : "/dashboard/me/calendar";

    const payload = {
      title,
      body,
      url: notifUrl,
      tag: `event-${event.id}-${alertMinutes}`,
      category: event.category,
    };

    await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh!,
            auth: sub.auth!,
          },
          payload
        ).then((result) => {
          if (!result.success && result.statusCode === 410) {
            expiredSubIds.push(sub.id);
          }
          return result;
        })
      )
    );

    sent++;
  }

  // ── Batch cleanup expired subscriptions ──
  if (expiredSubIds.length > 0) {
    await db
      .delete(pushSubscription)
      .where(inArray(pushSubscription.id, expiredSubIds));
  }

  // ── 1.5 Task reminders (timezone-aware, 9 AM local) ─────────
  let tasksSent = 0;
  const taskExpiredSubIds: number[] = [];
  try {
    const tasksWithReminders = await db
      .select()
      .from(task)
      .where(
        and(
          ne(task.reminder, "none"),
          eq(task.notify, true),
          eq(task.status, "pending")
        )
      );

    if (tasksWithReminders.length > 0) {
      const taskUserIds = [...new Set(tasksWithReminders.map((t) => t.userId))];

      // Reuse timezone/subs from calendar if available, otherwise query
      const missingTzUserIds = taskUserIds.filter((id) => !userTzMap.has(id));
      if (missingTzUserIds.length > 0) {
        const taskProfiles = await db
          .select({ userId: userProfile.userId, timezone: userProfile.timezone })
          .from(userProfile)
          .where(inArray(userProfile.userId, missingTzUserIds));
        for (const p of taskProfiles) {
          userTzMap.set(p.userId, p.timezone || DEFAULT_TZ);
        }
      }

      const missingSubUserIds = taskUserIds.filter((id) => !subsMap.has(id));
      if (missingSubUserIds.length > 0) {
        const taskSubs = await db
          .select()
          .from(pushSubscription)
          .where(inArray(pushSubscription.userId, missingSubUserIds));
        for (const sub of taskSubs) {
          const list = subsMap.get(sub.userId) || [];
          list.push(sub);
          subsMap.set(sub.userId, list);
        }
      }

      const TASK_NOTIFY_MINUTES = 9 * 60; // 9:00 AM local time

      for (const tk of tasksWithReminders) {
        const tz = userTzMap.get(tk.userId) || DEFAULT_TZ;
        const { localDate, localMinutes: currentMinutes } = getLocalDateTime(now, tz);

        // Only fire at 9 AM local time (within 90-second window)
        if (TASK_NOTIFY_MINUTES > currentMinutes || TASK_NOTIFY_MINUTES < currentMinutes - 1.5) {
          continue;
        }

        const subs = subsMap.get(tk.userId);
        if (!subs || subs.length === 0) continue;

        // Determine if this reminder should fire today + build dedup key
        let shouldFire = false;
        let dedupKey = "";

        switch (tk.reminder) {
          case "at_deadline":
            // Only on the due date itself
            if (tk.dueDate && tk.dueDate === localDate) {
              shouldFire = true;
              dedupKey = `task:${tk.id}`;
            }
            break;

          case "daily":
            shouldFire = true;
            dedupKey = `task:${tk.id}:${localDate}`;
            break;

          case "weekly": {
            // Fire on the same day-of-week as the due date (or Monday if none)
            const todayDate = new Date(localDate + "T00:00:00");
            const todayDay = todayDate.getDay();
            const targetDay = tk.dueDate
              ? new Date(tk.dueDate + "T00:00:00").getDay()
              : 1; // Monday default
            if (todayDay === targetDay) {
              shouldFire = true;
              dedupKey = `task:${tk.id}:${localDate}`;
            }
            break;
          }
        }

        if (!shouldFire) continue;

        // Claim-first dedup — atomic INSERT ON CONFLICT DO NOTHING
        const claimed = await db
          .insert(notificationLog)
          .values({ eventId: dedupKey, alertMinutes: 0 })
          .onConflictDoNothing()
          .returning({ id: notificationLog.id });

        if (claimed.length === 0) continue;

        // Build notification body based on due date proximity
        let taskBody = "Reminder";
        if (tk.dueDate) {
          const todayMs = new Date(localDate + "T00:00:00").getTime();
          const dueMs = new Date(tk.dueDate + "T00:00:00").getTime();
          const diffDays = Math.round((dueMs - todayMs) / 86400000);
          if (diffDays < 0) {
            taskBody = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`;
          } else if (diffDays === 0) {
            taskBody = "Due Today";
          } else if (diffDays === 1) {
            taskBody = "Due Tomorrow";
          } else {
            taskBody = `Due in ${diffDays} days`;
          }
        }

        const taskPayload = {
          title: `Task: ${tk.title}`,
          body: taskBody,
          url: "/dashboard/space/tasks",
          tag: `task-${tk.id}-${tk.reminder}`,
          category: "task",
        };

        await Promise.allSettled(
          subs.map((sub) =>
            sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh!, auth: sub.auth! },
              taskPayload
            ).then((result) => {
              if (!result.success && result.statusCode === 410) {
                taskExpiredSubIds.push(sub.id);
              }
              return result;
            })
          )
        );

        tasksSent++;
      }
    }
  } catch {
    // Don't block other notifications
  }

  // Cleanup expired task push subscriptions
  if (taskExpiredSubIds.length > 0) {
    await db
      .delete(pushSubscription)
      .where(inArray(pushSubscription.id, taskExpiredSubIds));
  }

  // ── 2. Post-exam follow-up (same event data, timezone-aware) ─
  let examFollowUps = 0;
  const examExpiredSubIds: number[] = [];
  try {
    const examAutomations = await db
      .select({
        id: notificationAutomation.id,
        templateTitle: notificationTemplate.title,
        templateBody: notificationTemplate.body,
        templateUrl: notificationTemplate.url,
      })
      .from(notificationAutomation)
      .innerJoin(
        notificationTemplate,
        eq(notificationAutomation.templateId, notificationTemplate.id)
      )
      .where(
        and(
          eq(notificationAutomation.enabled, true),
          eq(notificationAutomation.trigger, "exam_done")
        )
      );

    if (examAutomations.length > 0) {
      const examEvents = events.filter((e) => e.category === "exam");

      // Batch-load user names for all exam event owners
      const examUserIds = [...new Set(examEvents.map((e) => e.userId))];
      const userNameMap = new Map<string, string>();
      if (examUserIds.length > 0) {
        try {
          const userRows = (await db.execute(
            sql`SELECT id::text, name FROM neon_auth."user" WHERE id::text IN (${sqlInList(examUserIds)})`
          )) as any[];
          for (const row of userRows) {
            userNameMap.set(row.id, row.name || "there");
          }
        } catch {
          /* fallback — all users get "there" */
        }
      }

      for (const exam of examEvents) {
        const tz = userTzMap.get(exam.userId) || DEFAULT_TZ;
        const { localDate, localMinutes: currentMinutes } =
          getLocalDateTime(now, tz);

        if (exam.date !== localDate) continue;

        const endMinutes = timeToMinutes(exam.endTime);
        if (
          endMinutes > currentMinutes ||
          endMinutes < currentMinutes - 1.5
        )
          continue;

        // Deterministic template selection from event ID
        let hash = 0;
        for (let i = 0; i < exam.id.length; i++) hash = ((hash << 5) - hash + exam.id.charCodeAt(i)) | 0;
        const auto = examAutomations[Math.abs(hash) % examAutomations.length];
        const dedupPeriod = `${localDate}:${exam.id}`;

        // Claim-first dedup — atomic INSERT, skip if already claimed
        const claimed = await db
          .insert(notificationAutomationLog)
          .values({
            automationId: auto.id,
            userId: exam.userId,
            period: dedupPeriod,
          })
          .onConflictDoNothing()
          .returning({ id: notificationAutomationLog.id });

        if (claimed.length === 0) continue;

        // Use batch-loaded subscriptions
        const subs = subsMap.get(exam.userId);
        if (!subs || subs.length === 0) continue;

        const userName = userNameMap.get(exam.userId) || "there";

        const resolve = (text: string) =>
          text
            .replace(/\{\{exam_title\}\}/g, exam.title)
            .replace(/\{\{exam_time\}\}/g, exam.endTime)
            .replace(/\{\{name\}\}/g, userName);

        const title = resolve(auto.templateTitle);
        const body = resolve(auto.templateBody);
        const url = auto.templateUrl
          ? resolve(auto.templateUrl)
          : "/dashboard/me/calendar";

        await Promise.allSettled(
          subs.map((sub) =>
            sendPushNotification(
              {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh!,
                auth: sub.auth!,
              },
              { title, body, url }
            ).then((result) => {
              if (!result.success && result.statusCode === 410) {
                examExpiredSubIds.push(sub.id);
              }
              return result;
            })
          )
        );

        examFollowUps++;
      }
    }

    // Batch cleanup expired subscriptions from exam sends
    if (examExpiredSubIds.length > 0) {
      await db
        .delete(pushSubscription)
        .where(inArray(pushSubscription.id, examExpiredSubIds));
    }
  } catch {
    // Don't block other notifications
  }

  // ── 3. Scheduled campaigns ─────────────────────────────────
  let campaignResults: any[] = [];
  try {
    campaignResults = await processScheduledCampaigns();
  } catch {
    // Don't let campaign errors block calendar notifications
  }

  // ── 4. Daily automations (9:00 AM Istanbul) ────────────────
  // Uses Istanbul time for the daily run gate — automations engine
  // handles per-user timezone internally for birthday/anniversary matching.
  const istanbulTime = getLocalDateTime(now, DEFAULT_TZ);
  const istanbulMinuteOfHour = istanbulTime.localMinutes - istanbulTime.localHours * 60;
  let automationResults = { processed: 0, sent: 0, skipped: 0 };
  if (istanbulTime.localHours === 9 && istanbulMinuteOfHour < 5) {
    try {
      automationResults = await processAutomations();
    } catch (err) {
      console.error("Automation engine error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    date: utcDate,
    time: `${String(istanbulTime.localHours).padStart(2, "0")}:${String(istanbulTime.localMinutes % 60).padStart(2, "0")}`,
    eventsChecked: events.length,
    sent,
    skipped,
    tasksSent,
    examFollowUps,
    campaigns: campaignResults.length,
    automations: automationResults,
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
