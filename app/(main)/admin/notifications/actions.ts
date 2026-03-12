"use server";

import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import {
  pushSubscription,
  notificationTemplate,
  notificationCampaign,
  notificationAutomation,
  userProfile,
  faculty,
  program,
} from "@/database/schema";
import { eq, sql, desc } from "drizzle-orm";

// ── Stats ───────────────────────────────────────────────────

export async function getNotificationStats() {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");

  const rows = await db.execute<{
    total_subscriptions: string;
    unique_users: string;
    active_automations: string;
    total_templates: string;
  }>(sql`
    SELECT
      (SELECT count(*) FROM push_subscription) as total_subscriptions,
      (SELECT count(DISTINCT user_id) FROM push_subscription) as unique_users,
      (SELECT count(*) FROM notification_automation WHERE enabled = true) as active_automations,
      (SELECT count(*) FROM notification_template) as total_templates
  `);

  const stats = rows[0];

  return {
    totalSubscriptions: parseInt(stats?.total_subscriptions ?? "0"),
    uniqueUsers: parseInt(stats?.unique_users ?? "0"),
    activeAutomations: parseInt(stats?.active_automations ?? "0"),
    totalTemplates: parseInt(stats?.total_templates ?? "0"),
  };
}

// ── Templates CRUD ──────────────────────────────────────────

export async function getTemplates() {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");
  return db
    .select({
      id: notificationTemplate.id,
      name: notificationTemplate.name,
      title: notificationTemplate.title,
      body: notificationTemplate.body,
      url: notificationTemplate.url,
      translations: notificationTemplate.translations,
    })
    .from(notificationTemplate)
    .orderBy(desc(notificationTemplate.updatedAt));
}

export async function listTemplates({
  page = 1,
  limit = 15,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");

  const offset = (page - 1) * limit;

  const rows = await db.execute<{
    id: number;
    name: string;
    title: string;
    body: string;
    url: string | null;
    translations: string | null;
    totalCount: string;
  }>(sql`
    SELECT
      id, name, title, body, url,
      translations::text as translations,
      count(*) OVER() as "totalCount"
    FROM notification_template
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const total = Number(rows[0]?.totalCount ?? 0);

  return {
    templates: rows.map(({ totalCount: _, translations: t, ...r }) => ({
      ...r,
      translations: t ? JSON.parse(t) : null,
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createTemplate(data: {
  name: string;
  title: string;
  body: string;
  url?: string;
  translations?: Record<string, { title: string; body: string }>;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  const [row] = await db
    .insert(notificationTemplate)
    .values({
      name: data.name,
      title: data.title,
      body: data.body,
      url: data.url || null,
      translations: data.translations || null,
    })
    .returning();
  return row;
}

export async function updateTemplate(
  id: number,
  data: { name: string; title: string; body: string; url?: string; translations?: Record<string, { title: string; body: string }> }
) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  await db
    .update(notificationTemplate)
    .set({
      name: data.name,
      title: data.title,
      body: data.body,
      url: data.url || null,
      translations: data.translations || null,
      updatedAt: new Date(),
    })
    .where(eq(notificationTemplate.id, id));
}

export async function deleteTemplate(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  await db
    .delete(notificationTemplate)
    .where(eq(notificationTemplate.id, id));
}

// ── Campaigns ───────────────────────────────────────────────

export async function listCampaigns({
  page = 1,
  limit = 15,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");

  const offset = (page - 1) * limit;

  const rows = await db.execute<{
    id: number;
    title: string;
    body: string;
    target: string;
    targetUserId: string | null;
    scheduledAt: string | null;
    sentAt: string | null;
    status: string;
    statsSent: number;
    statsFailed: number;
    createdAt: string;
    totalCount: string;
  }>(sql`
    SELECT
      id,
      title,
      body,
      target,
      target_user_id as "targetUserId",
      scheduled_at as "scheduledAt",
      sent_at as "sentAt",
      status,
      stats_sent as "statsSent",
      stats_failed as "statsFailed",
      created_at as "createdAt",
      count(*) OVER() as "totalCount"
    FROM notification_campaign
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const total = Number(rows[0]?.totalCount ?? 0);

  return {
    campaigns: rows.map(({ totalCount: _, ...r }) => r),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createCampaign(data: {
  templateId?: number;
  title: string;
  body: string;
  url?: string;
  target: string;
  targetUserId?: string;
  scheduledAt?: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.send");

  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const status = scheduledAt ? "scheduled" : "draft";

  const [campaign] = await db
    .insert(notificationCampaign)
    .values({
      templateId: data.templateId || null,
      title: data.title,
      body: data.body,
      url: data.url || null,
      target: data.target,
      targetUserId: data.targetUserId || null,
      scheduledAt,
      status,
    })
    .returning();

  if (!scheduledAt) {
    return executeCampaign(campaign.id);
  }

  return { id: campaign.id, status: "scheduled" };
}

// ── Send Logic ──────────────────────────────────────────────

import { executeCampaignInternal } from "@/lib/campaign-scheduler";

export async function executeCampaign(campaignId: number) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.send");
  return executeCampaignInternal(campaignId);
}

// ── Automations CRUD ────────────────────────────────────────

export async function getAutomations() {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");
  const rows = await db
    .select({
      id: notificationAutomation.id,
      name: notificationAutomation.name,
      trigger: notificationAutomation.trigger,
      triggerDays: notificationAutomation.triggerDays,
      sendTime: notificationAutomation.sendTime,
      templateId: notificationAutomation.templateId,
      enabled: notificationAutomation.enabled,
      createdAt: notificationAutomation.createdAt,
      templateName: notificationTemplate.name,
      templateTitle: notificationTemplate.title,
      templateBody: notificationTemplate.body,
    })
    .from(notificationAutomation)
    .innerJoin(
      notificationTemplate,
      eq(notificationAutomation.templateId, notificationTemplate.id)
    )
    .orderBy(desc(notificationAutomation.createdAt));
  // Convert Date to ISO string for safe RSC serialization
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function createAutomation(data: {
  name: string;
  trigger: string;
  triggerDays?: number;
  sendTime?: string;
  templateId: number;
  enabled?: boolean;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  const [row] = await db
    .insert(notificationAutomation)
    .values({
      name: data.name,
      trigger: data.trigger,
      triggerDays: data.triggerDays ?? null,
      sendTime: data.sendTime || "09:00",
      templateId: data.templateId,
      enabled: data.enabled ?? true,
    })
    .returning();
  return row;
}

export async function updateAutomation(
  id: number,
  data: {
    name: string;
    trigger: string;
    triggerDays?: number;
    sendTime?: string;
    templateId: number;
    enabled?: boolean;
  }
) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  await db
    .update(notificationAutomation)
    .set({
      name: data.name,
      trigger: data.trigger,
      triggerDays: data.triggerDays ?? null,
      sendTime: data.sendTime || "09:00",
      templateId: data.templateId,
      enabled: data.enabled ?? true,
    })
    .where(eq(notificationAutomation.id, id));
}

export async function deleteAutomation(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  await db
    .delete(notificationAutomation)
    .where(eq(notificationAutomation.id, id));
}

export async function toggleAutomation(id: number, enabled: boolean) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.manage");
  await db
    .update(notificationAutomation)
    .set({ enabled })
    .where(eq(notificationAutomation.id, id));
}

// ── Audience data for segmentation ──────────────────────────

export async function getUniversities() {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");
  const rows = await db
    .select({ university: userProfile.university })
    .from(userProfile)
    .where(sql`${userProfile.university} IS NOT NULL AND ${userProfile.university} != ''`)
    .groupBy(userProfile.university);
  return rows.map((r) => r.university!).sort();
}

export async function getFaculties() {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");
  return db.select({ id: faculty.id, name: faculty.name }).from(faculty).orderBy(faculty.name);
}

export async function getPrograms(facultyId: number) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.view");
  return db
    .select({ id: program.id, name: program.name })
    .from(program)
    .where(eq(program.facultyId, facultyId))
    .orderBy(program.name);
}

// ── Search users for targeting ──────────────────────────────

export async function searchUsers(query: string) {
  const session = await getAdminSession();
  await requirePermission(session, "notifications.send");
  if (!query || query.length < 2) return [];

  const rows = await db.execute<{
    id: string;
    name: string;
    email: string;
  }>(
    sql`SELECT id::text, name, email FROM neon_auth."user"
        WHERE name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`}
        LIMIT 10`
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
  }));
}
