/**
 * Notification automation engine.
 *
 * Trigger types:
 *   welcome     — fires X days after signup (triggerDays: 1, 3, 7, ...)
 *   birthday    — fires on user's birthday (annually)
 *   inactivity  — fires after X days of no activity (triggerDays: 7, 14, 30, ...)
 *   milestone   — fires when user hits X days on the platform (triggerDays: 30, 90, 180, 365, ...)
 *   anniversary — fires on signup anniversary each year
 *   exam_done   — fires after user's exam calendar event ends (same day, after end time)
 *
 * Variables available in templates:
 *   {{name}}           — user display name
 *   {{email}}          — user email
 *   {{days}}           — days since signup
 *   {{university}}     — user's university
 *   {{faculty}}        — user's faculty name
 *   {{program}}        — user's program name
 *   {{events_today}}   — calendar events today
 *   {{events_week}}    — calendar events this week
 *   {{birthday}}       — user's birthday (MMM d)
 *   {{exam_title}}     — title of the exam that just ended
 *   {{exam_time}}      — time of the exam (HH:mm)
 */

import { db } from "@/lib/db";
import {
  notificationAutomation,
  notificationAutomationLog,
  notificationTemplate,
  pushSubscription,
  userProfile,
  faculty,
  program,
  calendarEvent,
} from "@/database/schema";
import { eq, and, ne, sql, gte, lte } from "drizzle-orm";
import { sendPushNotification } from "@/lib/web-push";

// ── Types ────────────────────────────────────────────────────

const DEFAULT_TZ = "Europe/Istanbul";

function getUserLocalDate(now: Date, timezone: string, isFallback = false): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    if (isFallback) return now.toISOString().slice(0, 10); // last resort: UTC
    return getUserLocalDate(now, DEFAULT_TZ, true);
  }
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

interface UserContext {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  birthday: string | null;
  lastActiveAt: Date | null;
  university: string | null;
  facultyName: string | null;
  programName: string | null;
  timezone: string;
  language: string;
  eventsToday: number;
  eventsWeek: number;
  // For exam_done trigger: exams that ended today
  completedExams: { title: string; endTime: string }[];
}

interface TemplateTranslations {
  [lang: string]: { title: string; body: string };
}

interface AutomationRow {
  id: number;
  name: string;
  trigger: string;
  triggerDays: number | null;
  templateId: number;
  enabled: boolean;
  templateTitle: string;
  templateBody: string;
  templateUrl: string | null;
  templateTranslations: TemplateTranslations | null;
}

// ── i18n helper ──────────────────────────────────────────────

function getLocalizedTemplate(
  auto: AutomationRow,
  lang: string
): { title: string; body: string } {
  if (lang !== "en" && auto.templateTranslations) {
    const t = auto.templateTranslations[lang];
    if (t?.title && t?.body) return { title: t.title, body: t.body };
  }
  return { title: auto.templateTitle, body: auto.templateBody };
}

// ── Variable resolution ──────────────────────────────────────

// Re-export constants from the shared (client-safe) module
export { TEMPLATE_VARIABLES, TRIGGER_TYPES } from "@/lib/notification-constants";

function resolveVars(text: string, ctx: UserContext): string {
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(ctx.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let birthdayFormatted = "";
  if (ctx.birthday) {
    try {
      const [, m, d] = ctx.birthday.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      birthdayFormatted = `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
    } catch { /* ignore */ }
  }

  // For exam_done trigger — use the first completed exam
  const examTitle = ctx.completedExams?.[0]?.title || "your exam";
  const examTime = ctx.completedExams?.[0]?.endTime || "";

  return text
    .replace(/\{\{name\}\}/g, ctx.name || "there")
    .replace(/\{\{email\}\}/g, ctx.email || "")
    .replace(/\{\{days\}\}/g, String(daysSinceSignup))
    .replace(/\{\{university\}\}/g, ctx.university || "your university")
    .replace(/\{\{faculty\}\}/g, ctx.facultyName || "your faculty")
    .replace(/\{\{program\}\}/g, ctx.programName || "your program")
    .replace(/\{\{events_today\}\}/g, String(ctx.eventsToday))
    .replace(/\{\{events_week\}\}/g, String(ctx.eventsWeek))
    .replace(/\{\{birthday\}\}/g, birthdayFormatted)
    .replace(/\{\{exam_title\}\}/g, examTitle)
    .replace(/\{\{exam_time\}\}/g, examTime);
}

// ── Main engine ─────────────────────────────────────────────
// triggerFilter: optional — if provided, only process automations with that trigger type.
// Used by cron: daily triggers (welcome, birthday, etc.) run at 9 AM,
// event-based triggers (exam_done) run every minute.

const SEND_BATCH_SIZE = 100;

export async function processAutomations(triggerFilter?: string): Promise<{
  processed: number;
  sent: number;
  skipped: number;
}> {
  // 1. Get enabled automations (optionally filtered by trigger type)
  // exam_done is handled directly in the cron route alongside calendar events
  const conditions = [
    eq(notificationAutomation.enabled, true),
    ne(notificationAutomation.trigger, "exam_done"),
  ];
  if (triggerFilter) {
    conditions.push(eq(notificationAutomation.trigger, triggerFilter));
  }

  const automations = await db
    .select({
      id: notificationAutomation.id,
      name: notificationAutomation.name,
      trigger: notificationAutomation.trigger,
      triggerDays: notificationAutomation.triggerDays,
      templateId: notificationAutomation.templateId,
      enabled: notificationAutomation.enabled,
      templateTitle: notificationTemplate.title,
      templateBody: notificationTemplate.body,
      templateUrl: notificationTemplate.url,
      templateTranslations: notificationTemplate.translations,
    })
    .from(notificationAutomation)
    .innerJoin(notificationTemplate, eq(notificationAutomation.templateId, notificationTemplate.id))
    .where(and(...conditions)) as unknown as AutomationRow[];

  if (automations.length === 0) return { processed: 0, sent: 0, skipped: 0 };

  // 2. Get today's date in Istanbul timezone (UTC+3) — consistent with calendar cron
  const now = new Date();
  const istanbulDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayStr = istanbulDate.toISOString().slice(0, 10);
  const todayMMDD = todayStr.slice(5);
  const yearStr = todayStr.slice(0, 4);
  const weekNumber = getISOWeek(istanbulDate);
  const weekStr = `${yearStr}-W${String(weekNumber).padStart(2, "0")}`;

  // 3. Get all users who have push subscriptions (only they can receive)
  const allSubs = await db.select().from(pushSubscription);
  const userIds = [...new Set(allSubs.map((s) => s.userId))];
  if (userIds.length === 0) return { processed: automations.length, sent: 0, skipped: 0 };

  // Build subscription map for O(1) lookup (eliminates linear filter per user)
  const subsMap = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const list = subsMap.get(sub.userId) || [];
    list.push(sub);
    subsMap.set(sub.userId, list);
  }

  // 4. Fetch user data
  const usersMap = await buildUserContextMap(userIds, todayStr);

  // 5. Batch-load existing dedup logs for all automations (eliminates N+1)
  const autoIds = automations.map((a) => a.id);
  const allPeriods = [...new Set(automations.map((auto) =>
    getDeduplicationPeriod(auto, todayStr, yearStr, weekStr)
  ))];
  const existingLogs = await db
    .select({
      automationId: notificationAutomationLog.automationId,
      userId: notificationAutomationLog.userId,
      period: notificationAutomationLog.period,
    })
    .from(notificationAutomationLog)
    .where(
      and(
        sql`${notificationAutomationLog.automationId} = ANY(${autoIds}::int[])`,
        sql`${notificationAutomationLog.period} = ANY(${allPeriods}::text[])`
      )
    );
  const dedupSet = new Set(
    existingLogs.map((l) => `${l.automationId}:${l.userId}:${l.period}`)
  );

  let sent = 0;
  let skipped = 0;
  const expiredSubIds: number[] = [];

  // 6. Process each automation
  for (const auto of automations) {
    const eligibleUsers = getEligibleUsers(auto, usersMap, todayMMDD);
    const period = getDeduplicationPeriod(auto, todayStr, yearStr, weekStr);

    for (const userId of eligibleUsers) {
      // In-memory dedup check first
      if (dedupSet.has(`${auto.id}:${userId}:${period}`)) {
        skipped++;
        continue;
      }

      // Claim-first dedup: atomic INSERT, skip if already claimed
      const claimed = await db
        .insert(notificationAutomationLog)
        .values({ automationId: auto.id, userId, period })
        .onConflictDoNothing()
        .returning({ id: notificationAutomationLog.id });

      if (claimed.length === 0) {
        skipped++;
        continue;
      }

      // Resolve variables and send (pick user's language)
      const ctx = usersMap.get(userId)!;
      const localized = getLocalizedTemplate(auto, ctx.language);
      const title = resolveVars(localized.title, ctx);
      const body = resolveVars(localized.body, ctx);
      const url = auto.templateUrl ? resolveVars(auto.templateUrl, ctx) : "/dashboard";

      const userSubs = (subsMap.get(userId) || []).filter((s) => s.p256dh && s.auth);

      // Send in batches — safe counting after each batch settles
      for (let i = 0; i < userSubs.length; i += SEND_BATCH_SIZE) {
        const batch = userSubs.slice(i, i + SEND_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (sub) => {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh!, auth: sub.auth! },
              { title, body, url }
            );
            return { success: result.success, statusCode: result.statusCode, subId: sub.id };
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            if (r.value.success) sent++;
            if (!r.value.success && r.value.statusCode === 410) {
              expiredSubIds.push(r.value.subId);
            }
          }
        }
      }
    }
  }

  // Batch cleanup expired subscriptions
  if (expiredSubIds.length > 0) {
    await db
      .delete(pushSubscription)
      .where(sql`${pushSubscription.id} = ANY(${expiredSubIds}::int[])`);
  }

  return { processed: automations.length, sent, skipped };
}

// ── Helpers ──────────────────────────────────────────────────

function getEligibleUsers(
  auto: AutomationRow,
  usersMap: Map<string, UserContext>,
  _todayMMDD: string
): string[] {
  const eligible: string[] = [];
  const now = new Date();

  for (const [userId, ctx] of usersMap) {
    // Use the user's local date for timezone-accurate checks
    const userLocalDate = getUserLocalDate(now, ctx.timezone);
    const userLocalMMDD = userLocalDate.slice(5); // MM-DD

    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(ctx.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (auto.trigger) {
      case "welcome":
        if (auto.triggerDays !== null && daysSinceSignup === auto.triggerDays) {
          eligible.push(userId);
        }
        break;

      case "birthday": {
        // Match MM-DD in the user's local timezone
        // Leap year fix: Feb 29 birthdays get notified on Mar 1 in non-leap years
        if (!ctx.birthday) break;
        const bMMDD = ctx.birthday.slice(5);
        const localYear = parseInt(userLocalDate.slice(0, 4));
        const leapDayMatch = bMMDD === "02-29" && userLocalMMDD === "03-01" && !isLeapYear(localYear);
        if (bMMDD === userLocalMMDD || leapDayMatch) {
          eligible.push(userId);
        }
        break;
      }

      case "inactivity": {
        if (auto.triggerDays === null) break;
        const lastActive = ctx.lastActiveAt || new Date(ctx.createdAt);
        const daysSinceActive = Math.floor(
          (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActive === auto.triggerDays) {
          eligible.push(userId);
        }
        break;
      }

      case "milestone":
        if (auto.triggerDays !== null && daysSinceSignup === auto.triggerDays) {
          eligible.push(userId);
        }
        break;

      case "anniversary": {
        // Match signup MM-DD in the user's local timezone
        const signupDate = new Date(ctx.createdAt);
        const signupMMDD = `${String(signupDate.getMonth() + 1).padStart(2, "0")}-${String(signupDate.getDate()).padStart(2, "0")}`;
        // Leap year fix: Feb 29 signups get anniversary on Mar 1 in non-leap years
        const aLocalYear = parseInt(userLocalDate.slice(0, 4));
        const aLeapMatch = signupMMDD === "02-29" && userLocalMMDD === "03-01" && !isLeapYear(aLocalYear);
        if ((signupMMDD === userLocalMMDD || aLeapMatch) && daysSinceSignup >= 365) {
          eligible.push(userId);
        }
        break;
      }

      case "exam_done":
        if (ctx.completedExams && ctx.completedExams.length > 0) {
          eligible.push(userId);
        }
        break;
    }
  }

  return eligible;
}

function getDeduplicationPeriod(
  auto: AutomationRow,
  todayStr: string,
  yearStr: string,
  _weekStr: string
): string {
  switch (auto.trigger) {
    case "welcome":
    case "milestone":
      // Fire once ever per user per automation
      return "once";
    case "birthday":
    case "anniversary":
      // Fire once per year
      return yearStr;
    case "inactivity":
    case "exam_done":
      // Fire once per day
      return todayStr;
    default:
      return todayStr;
  }
}

async function buildUserContextMap(
  userIds: string[],
  todayStr: string
): Promise<Map<string, UserContext>> {
  const map = new Map<string, UserContext>();

  // Fetch auth user data
  const authRows = (await db.execute(
    sql`SELECT id::text, name, email, "createdAt" FROM neon_auth."user" WHERE id = ANY(${userIds}::text[])`
  )) as any[];

  // Fetch profiles with faculty/program names + timezone
  const profiles = await db
    .select({
      userId: userProfile.userId,
      university: userProfile.university,
      birthday: userProfile.birthday,
      lastActiveAt: userProfile.lastActiveAt,
      timezone: userProfile.timezone,
      language: userProfile.language,
      facultyName: faculty.name,
      programName: program.name,
    })
    .from(userProfile)
    .leftJoin(faculty, eq(userProfile.facultyId, faculty.id))
    .leftJoin(program, eq(userProfile.programId, program.id))
    .where(sql`${userProfile.userId} = ANY(${userIds}::text[])`);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Fetch today's event counts per user
  const todayEvents = await db
    .select({
      userId: calendarEvent.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(calendarEvent)
    .where(eq(calendarEvent.date, todayStr))
    .groupBy(calendarEvent.userId);

  const todayEventMap = new Map(todayEvents.map((e) => [e.userId, e.count]));

  // Fetch this week's event counts
  const weekStart = getWeekStart(new Date(todayStr));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const weekEvents = await db
    .select({
      userId: calendarEvent.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(calendarEvent)
    .where(
      and(
        gte(calendarEvent.date, weekStartStr),
        lte(calendarEvent.date, weekEndStr)
      )
    )
    .groupBy(calendarEvent.userId);

  const weekEventMap = new Map(weekEvents.map((e) => [e.userId, e.count]));

  // Fetch completed exams today (category = "exam", endTime < current Istanbul time)
  const istanbulNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const currentTimeStr = `${String(istanbulNow.getUTCHours()).padStart(2, "0")}:${String(istanbulNow.getUTCMinutes()).padStart(2, "0")}`;

  const completedExams = await db
    .select({
      userId: calendarEvent.userId,
      title: calendarEvent.title,
      endTime: calendarEvent.endTime,
    })
    .from(calendarEvent)
    .where(
      and(
        eq(calendarEvent.date, todayStr),
        eq(calendarEvent.category, "exam"),
        lte(calendarEvent.endTime, currentTimeStr)
      )
    );

  const completedExamsMap = new Map<string, { title: string; endTime: string }[]>();
  for (const e of completedExams) {
    const existing = completedExamsMap.get(e.userId) || [];
    existing.push({ title: e.title, endTime: e.endTime });
    completedExamsMap.set(e.userId, existing);
  }

  // Build context
  for (const row of authRows) {
    const profile = profileMap.get(row.id);
    map.set(row.id, {
      id: row.id,
      name: row.name || "there",
      email: row.email || "",
      createdAt: row.createdAt,
      birthday: profile?.birthday || null,
      lastActiveAt: profile?.lastActiveAt || null,
      university: profile?.university || null,
      facultyName: profile?.facultyName || null,
      programName: profile?.programName || null,
      timezone: profile?.timezone || DEFAULT_TZ,
      language: profile?.language || "en",
      eventsToday: todayEventMap.get(row.id) || 0,
      eventsWeek: weekEventMap.get(row.id) || 0,
      completedExams: completedExamsMap.get(row.id) || [],
    });
  }

  return map;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
