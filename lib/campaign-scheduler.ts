import { db } from "@/lib/db";
import {
  pushSubscription,
  notificationCampaign,
  userProfile,
  faculty,
  program,
  calendarEvent,
} from "@/database/schema";
import { eq, and, lte, sql, gte } from "drizzle-orm";
import { sendPushNotification } from "@/lib/web-push";

// ── Full user context for variable resolution ─────────────────

interface FullUserContext {
  name: string;
  email: string;
  createdAt: string;
  birthday: string | null;
  university: string | null;
  facultyName: string | null;
  programName: string | null;
  eventsToday: number;
  eventsWeek: number;
}

async function buildFullUserContext(
  userIds: string[]
): Promise<Record<string, FullUserContext>> {
  const result: Record<string, FullUserContext> = {};
  if (userIds.length === 0) return result;

  const todayStr = new Date().toISOString().slice(0, 10);

  const authRows = (await db.execute(
    sql`SELECT id::text, name, email, "createdAt" FROM neon_auth."user" WHERE id = ANY(${userIds})`
  )) as any[];

  const profiles = await db
    .select({
      userId: userProfile.userId,
      university: userProfile.university,
      birthday: userProfile.birthday,
      facultyName: faculty.name,
      programName: program.name,
    })
    .from(userProfile)
    .leftJoin(faculty, eq(userProfile.facultyId, faculty.id))
    .leftJoin(program, eq(userProfile.programId, program.id))
    .where(sql`${userProfile.userId} = ANY(${userIds})`);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const todayEvents = await db
    .select({
      userId: calendarEvent.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(calendarEvent)
    .where(
      and(
        eq(calendarEvent.date, todayStr),
        sql`${calendarEvent.userId} = ANY(${userIds})`
      )
    )
    .groupBy(calendarEvent.userId);
  const todayEventMap = new Map(todayEvents.map((e) => [e.userId, e.count]));

  const now = new Date(todayStr);
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekEvents = await db
    .select({
      userId: calendarEvent.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(calendarEvent)
    .where(
      and(
        gte(calendarEvent.date, weekStart.toISOString().slice(0, 10)),
        lte(calendarEvent.date, weekEnd.toISOString().slice(0, 10)),
        sql`${calendarEvent.userId} = ANY(${userIds})`
      )
    )
    .groupBy(calendarEvent.userId);
  const weekEventMap = new Map(weekEvents.map((e) => [e.userId, e.count]));

  for (const row of authRows) {
    const profile = profileMap.get(row.id);
    result[row.id] = {
      name: row.name || "there",
      email: row.email || "",
      createdAt: row.createdAt,
      birthday: profile?.birthday || null,
      university: profile?.university || null,
      facultyName: profile?.facultyName || null,
      programName: profile?.programName || null,
      eventsToday: todayEventMap.get(row.id) || 0,
      eventsWeek: weekEventMap.get(row.id) || 0,
    };
  }

  return result;
}

function resolveVariables(text: string, user: FullUserContext): string {
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let birthdayFormatted = "";
  if (user.birthday) {
    try {
      const [, m, d] = user.birthday.split("-");
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      birthdayFormatted = `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
    } catch {
      /* ignore */
    }
  }

  return text
    .replace(/\{\{name\}\}/g, user.name || "there")
    .replace(/\{\{email\}\}/g, user.email || "")
    .replace(/\{\{days\}\}/g, String(daysSinceSignup))
    .replace(/\{\{university\}\}/g, user.university || "your university")
    .replace(/\{\{faculty\}\}/g, user.facultyName || "your faculty")
    .replace(/\{\{program\}\}/g, user.programName || "your program")
    .replace(/\{\{events_today\}\}/g, String(user.eventsToday))
    .replace(/\{\{events_week\}\}/g, String(user.eventsWeek))
    .replace(/\{\{birthday\}\}/g, birthdayFormatted);
}

// ── Target subscription lookup ─────────────────────────────────

async function getTargetSubscriptions(campaign: {
  target: string;
  targetUserId: string | null;
}) {
  switch (campaign.target) {
    case "user":
      if (!campaign.targetUserId) return [];
      return db
        .select()
        .from(pushSubscription)
        .where(eq(pushSubscription.userId, campaign.targetUserId));

    case "university": {
      if (!campaign.targetUserId) return [];
      const uniUsers = await db
        .select({ userId: userProfile.userId })
        .from(userProfile)
        .where(eq(userProfile.university, campaign.targetUserId));
      const uids = uniUsers.map((u) => u.userId);
      if (uids.length === 0) return [];
      return db
        .select()
        .from(pushSubscription)
        .where(sql`${pushSubscription.userId} = ANY(${uids})`);
    }

    case "faculty": {
      if (!campaign.targetUserId) return [];
      const id = parseInt(campaign.targetUserId);
      if (isNaN(id)) return [];
      const facUsers = await db
        .select({ userId: userProfile.userId })
        .from(userProfile)
        .where(eq(userProfile.facultyId, id));
      const uids = facUsers.map((u) => u.userId);
      if (uids.length === 0) return [];
      return db
        .select()
        .from(pushSubscription)
        .where(sql`${pushSubscription.userId} = ANY(${uids})`);
    }

    case "program": {
      if (!campaign.targetUserId) return [];
      const id = parseInt(campaign.targetUserId);
      if (isNaN(id)) return [];
      const progUsers = await db
        .select({ userId: userProfile.userId })
        .from(userProfile)
        .where(eq(userProfile.programId, id));
      const uids = progUsers.map((u) => u.userId);
      if (uids.length === 0) return [];
      return db
        .select()
        .from(pushSubscription)
        .where(sql`${pushSubscription.userId} = ANY(${uids})`);
    }

    case "all":
    default:
      return db.select().from(pushSubscription);
  }
}

// ── Campaign execution ─────────────────────────────────────────

const BATCH_SIZE = 100;

export async function executeCampaignInternal(campaignId: number) {
  await db
    .update(notificationCampaign)
    .set({ status: "sending" })
    .where(eq(notificationCampaign.id, campaignId));

  try {
    const [campaign] = await db
      .select()
      .from(notificationCampaign)
      .where(eq(notificationCampaign.id, campaignId));

    if (!campaign) return { error: "Campaign not found" };

    const subs = await getTargetSubscriptions(campaign);
    const validSubs = subs.filter((s) => s.p256dh && s.auth);

    if (validSubs.length === 0) {
      await db
        .update(notificationCampaign)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(notificationCampaign.id, campaignId));
      return { sent: 0, failed: 0, error: "No subscriptions found." };
    }

    const userIds = [...new Set(validSubs.map((s) => s.userId))];
    const userData = await buildFullUserContext(userIds);

    let sent = 0;
    let failed = 0;
    const expired: number[] = [];

    for (let i = 0; i < validSubs.length; i += BATCH_SIZE) {
      const batch = validSubs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const user = userData[sub.userId] || {
            name: "there",
            email: "",
            createdAt: new Date().toISOString(),
            birthday: null,
            university: null,
            facultyName: null,
            programName: null,
            eventsToday: 0,
            eventsWeek: 0,
          };
          const title = resolveVariables(campaign.title, user);
          const body = resolveVariables(campaign.body, user);
          const url = campaign.url
            ? resolveVariables(campaign.url, user)
            : "/dashboard";

          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh!, auth: sub.auth! },
            { title, body, url }
          );

          return {
            success: result.success,
            statusCode: result.statusCode,
            subId: sub.id,
          };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          if (r.value.success) {
            sent++;
          } else {
            failed++;
            if (r.value.statusCode === 410) expired.push(r.value.subId);
          }
        } else {
          failed++;
        }
      }
    }

    if (expired.length > 0) {
      await db
        .delete(pushSubscription)
        .where(sql`${pushSubscription.id} = ANY(${expired})`);
    }

    await db
      .update(notificationCampaign)
      .set({
        status: "sent",
        sentAt: new Date(),
        statsSent: sent,
        statsFailed: failed,
      })
      .where(eq(notificationCampaign.id, campaignId));

    return { sent, failed, expired: expired.length };
  } catch (error) {
    // Critical fix: don't leave campaign stuck in "sending" forever
    await db
      .update(notificationCampaign)
      .set({ status: "failed" })
      .where(eq(notificationCampaign.id, campaignId));
    throw error;
  }
}

// ── Process scheduled campaigns (called by cron) ────────────

export async function processScheduledCampaigns() {
  const now = new Date();
  const due = await db
    .select()
    .from(notificationCampaign)
    .where(
      and(
        eq(notificationCampaign.status, "scheduled"),
        lte(notificationCampaign.scheduledAt, now)
      )
    );

  const results = [];
  for (const campaign of due) {
    const result = await executeCampaignInternal(campaign.id);
    results.push({ id: campaign.id, ...result });
  }
  return results;
}
