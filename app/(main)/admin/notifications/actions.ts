"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  pushSubscription,
  adminUser,
  notificationTemplate,
  notificationCampaign,
  notificationAutomation,
  userProfile,
  faculty,
  program,
} from "@/database/schema";
import { eq, sql, desc } from "drizzle-orm";

async function requireAdmin() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  const rows = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.userId, session.user.id))
    .limit(1);
  if (!rows[0]) redirect("/dashboard");
  return session;
}

// ── Stats ───────────────────────────────────────────────────

export async function getNotificationStats() {
  await requireAdmin();
  const subs = await db
    .select({ userId: pushSubscription.userId })
    .from(pushSubscription);
  const uniqueUsers = new Set(subs.map((s) => s.userId)).size;

  const automationCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationAutomation)
    .where(eq(notificationAutomation.enabled, true));

  return {
    totalSubscriptions: subs.length,
    uniqueUsers,
    activeAutomations: automationCount[0]?.count || 0,
  };
}

// ── Templates CRUD ──────────────────────────────────────────

export async function getTemplates() {
  await requireAdmin();
  return db
    .select()
    .from(notificationTemplate)
    .orderBy(desc(notificationTemplate.updatedAt));
}

export async function createTemplate(data: {
  name: string;
  title: string;
  body: string;
  url?: string;
}) {
  await requireAdmin();
  const [row] = await db
    .insert(notificationTemplate)
    .values({
      name: data.name,
      title: data.title,
      body: data.body,
      url: data.url || null,
    })
    .returning();
  return row;
}

export async function updateTemplate(
  id: number,
  data: { name: string; title: string; body: string; url?: string }
) {
  await requireAdmin();
  await db
    .update(notificationTemplate)
    .set({
      name: data.name,
      title: data.title,
      body: data.body,
      url: data.url || null,
      updatedAt: new Date(),
    })
    .where(eq(notificationTemplate.id, id));
}

export async function deleteTemplate(id: number) {
  await requireAdmin();
  await db
    .delete(notificationTemplate)
    .where(eq(notificationTemplate.id, id));
}

// ── Campaigns ───────────────────────────────────────────────

export async function getCampaigns() {
  await requireAdmin();
  return db
    .select()
    .from(notificationCampaign)
    .orderBy(desc(notificationCampaign.createdAt))
    .limit(50);
}

export async function createCampaign(data: {
  templateId?: number;
  title: string;
  body: string;
  url?: string;
  target: string; // "all" | "user" | "university" | "faculty" | "program"
  targetUserId?: string; // userId, university name, facultyId, or programId
  scheduledAt?: string;
}) {
  await requireAdmin();

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
  await requireAdmin();
  return executeCampaignInternal(campaignId);
}

// ── Automations CRUD ────────────────────────────────────────

export async function getAutomations() {
  await requireAdmin();
  return db
    .select({
      id: notificationAutomation.id,
      name: notificationAutomation.name,
      trigger: notificationAutomation.trigger,
      triggerDays: notificationAutomation.triggerDays,
      templateId: notificationAutomation.templateId,
      enabled: notificationAutomation.enabled,
      createdAt: notificationAutomation.createdAt,
      templateName: notificationTemplate.name,
    })
    .from(notificationAutomation)
    .innerJoin(
      notificationTemplate,
      eq(notificationAutomation.templateId, notificationTemplate.id)
    )
    .orderBy(desc(notificationAutomation.createdAt));
}

export async function createAutomation(data: {
  name: string;
  trigger: string;
  triggerDays?: number;
  templateId: number;
  enabled?: boolean;
}) {
  await requireAdmin();
  const [row] = await db
    .insert(notificationAutomation)
    .values({
      name: data.name,
      trigger: data.trigger,
      triggerDays: data.triggerDays ?? null,
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
    templateId: number;
    enabled?: boolean;
  }
) {
  await requireAdmin();
  await db
    .update(notificationAutomation)
    .set({
      name: data.name,
      trigger: data.trigger,
      triggerDays: data.triggerDays ?? null,
      templateId: data.templateId,
      enabled: data.enabled ?? true,
    })
    .where(eq(notificationAutomation.id, id));
}

export async function deleteAutomation(id: number) {
  await requireAdmin();
  // Logs are cascade-deleted by the DB foreign key constraint
  await db
    .delete(notificationAutomation)
    .where(eq(notificationAutomation.id, id));
}

export async function toggleAutomation(id: number, enabled: boolean) {
  await requireAdmin();
  await db
    .update(notificationAutomation)
    .set({ enabled })
    .where(eq(notificationAutomation.id, id));
}

// ── Audience data for segmentation ──────────────────────────

export async function getUniversities() {
  await requireAdmin();
  const rows = await db
    .select({ university: userProfile.university })
    .from(userProfile)
    .where(sql`${userProfile.university} IS NOT NULL AND ${userProfile.university} != ''`)
    .groupBy(userProfile.university);
  return rows.map((r) => r.university!).sort();
}

export async function getFaculties() {
  await requireAdmin();
  return db.select({ id: faculty.id, name: faculty.name }).from(faculty).orderBy(faculty.name);
}

export async function getPrograms(facultyId: number) {
  await requireAdmin();
  return db
    .select({ id: program.id, name: program.name })
    .from(program)
    .where(eq(program.facultyId, facultyId))
    .orderBy(program.name);
}

// ── Search users for targeting ──────────────────────────────

export async function searchUsers(query: string) {
  await requireAdmin();
  if (!query || query.length < 2) return [];

  const rows = await db.execute(
    sql`SELECT id::text, name, email FROM neon_auth."user"
        WHERE name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`}
        LIMIT 10`
  );

  return (rows as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
  }));
}
