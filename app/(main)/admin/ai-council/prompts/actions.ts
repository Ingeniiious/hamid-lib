"use server";

import { db } from "@/lib/db";
import { promptTemplate } from "@/database/schema";
import { eq, asc, sql, ilike, or, and } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

// ── Overview stats (single query) ──

export async function getPromptStats() {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.view");

  const [stats] = await db.execute<{
    total_templates: string;
    active_templates: string;
    content_types_with_templates: string;
  }>(sql`
    SELECT
      (SELECT count(*) FROM prompt_template) as total_templates,
      (SELECT count(*) FROM prompt_template WHERE is_active = true) as active_templates,
      (SELECT count(DISTINCT content_type) FROM prompt_template) as content_types_with_templates
  `);

  return {
    totalTemplates: parseInt(stats.total_templates),
    activeTemplates: parseInt(stats.active_templates),
    contentTypesWithTemplates: parseInt(stats.content_types_with_templates),
  };
}

// ── Prompt templates (paginated, single query with window count) ──

interface ListPromptTemplatesParams {
  search?: string;
  page?: number;
  limit?: number;
  contentType?: string;
}

export async function listPromptTemplates({
  search,
  page = 1,
  limit = 20,
  contentType,
}: ListPromptTemplatesParams = {}) {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (contentType) {
    conditions.push(eq(promptTemplate.contentType, contentType));
  }

  if (search) {
    conditions.push(
      or(
        ilike(promptTemplate.name, `%${search}%`),
        ilike(promptTemplate.description, `%${search}%`),
        ilike(promptTemplate.contentType, `%${search}%`)
      )!
    );
  }

  const whereCondition =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  const rows = await db
    .select({
      id: promptTemplate.id,
      contentType: promptTemplate.contentType,
      name: promptTemplate.name,
      description: promptTemplate.description,
      structurePrompt: promptTemplate.structurePrompt,
      isActive: promptTemplate.isActive,
      createdAt: promptTemplate.createdAt,
      updatedAt: promptTemplate.updatedAt,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(promptTemplate)
    .where(whereCondition)
    .orderBy(asc(promptTemplate.contentType), asc(promptTemplate.name))
    .limit(safeLimit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  return {
    templates: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

// ── Prompt template CRUD ──

export async function createPromptTemplate(data: {
  contentType: string;
  name: string;
  description?: string;
  structurePrompt: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.manage");

  const [row] = await db
    .insert(promptTemplate)
    .values({
      contentType: data.contentType,
      name: data.name,
      description: data.description || null,
      structurePrompt: data.structurePrompt,
      isActive: false,
    })
    .returning({ id: promptTemplate.id });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "create_prompt_template",
    entityType: "prompt_template",
    entityId: String(row.id),
    details: { contentType: data.contentType, name: data.name },
  });

  return { success: true, id: row.id };
}

export async function updatePromptTemplate(
  id: number,
  data: {
    name?: string;
    description?: string;
    structurePrompt?: string;
  }
) {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.manage");

  await db
    .update(promptTemplate)
    .set({
      name: data.name,
      description: data.description,
      structurePrompt: data.structurePrompt,
      updatedAt: new Date(),
    })
    .where(eq(promptTemplate.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "update_prompt_template",
    entityType: "prompt_template",
    entityId: String(id),
    details: data,
  });

  return { success: true };
}

export async function activatePromptTemplate(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.manage");

  // Get the template to find its contentType
  const [template] = await db
    .select({
      contentType: promptTemplate.contentType,
      name: promptTemplate.name,
    })
    .from(promptTemplate)
    .where(eq(promptTemplate.id, id));

  if (!template) {
    return { error: "Template not found." };
  }

  // Deactivate all other templates of the same content type
  await db
    .update(promptTemplate)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(promptTemplate.contentType, template.contentType));

  // Activate this one
  await db
    .update(promptTemplate)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(promptTemplate.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "activate_prompt_template",
    entityType: "prompt_template",
    entityId: String(id),
    details: { contentType: template.contentType, name: template.name },
  });

  return { success: true };
}

export async function deletePromptTemplate(id: number) {
  const session = await getAdminSession();
  await requirePermission(session, "ai_council.manage");

  // Check if template is active
  const [template] = await db
    .select({
      isActive: promptTemplate.isActive,
    })
    .from(promptTemplate)
    .where(eq(promptTemplate.id, id));

  if (!template) {
    return { error: "Template not found." };
  }

  if (template.isActive) {
    return {
      error:
        "Cannot delete active template. Activate another template first.",
    };
  }

  await db.delete(promptTemplate).where(eq(promptTemplate.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_prompt_template",
    entityType: "prompt_template",
    entityId: String(id),
  });

  return { success: true };
}

// ── Internal helper (no auth — called by pipeline) ──

export async function getActiveTemplate(
  contentType: string
): Promise<string | null> {
  const [row] = await db
    .select({
      structurePrompt: promptTemplate.structurePrompt,
    })
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.contentType, contentType),
        eq(promptTemplate.isActive, true)
      )
    );

  return row?.structurePrompt ?? null;
}
