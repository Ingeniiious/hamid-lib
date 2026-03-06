"use server";

import { db } from "@/lib/db";
import { faculty, program, course } from "@/database/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function listFaculties() {
  const session = await getAdminSession();
  requirePermission(session, "faculties.view");

  const rows = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      slug: faculty.slug,
      university: faculty.university,
      description: faculty.description,
      displayOrder: faculty.displayOrder,
      createdAt: faculty.createdAt,
    })
    .from(faculty)
    .orderBy(asc(faculty.displayOrder), asc(faculty.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createFaculty(data: {
  name: string;
  slug: string;
  university: string;
  description?: string;
}) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  const [row] = await db
    .insert(faculty)
    .values({
      name: data.name,
      slug: data.slug,
      university: data.university,
      description: data.description || null,
    })
    .returning({ id: faculty.id });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "create_faculty",
    entityType: "faculty",
    entityId: String(row.id),
    details: { name: data.name, slug: data.slug, university: data.university },
  });

  return { success: true, id: row.id };
}

export async function updateFaculty(
  id: number,
  data: {
    name?: string;
    slug?: string;
    university?: string;
    description?: string;
  }
) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  await db
    .update(faculty)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(faculty.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "update_faculty",
    entityType: "faculty",
    entityId: String(id),
    details: data,
  });

  return { success: true };
}

export async function deleteFaculty(id: number) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  // Check if faculty has courses
  const courseCount = await db
    .select({ count: sql<string>`count(*)` })
    .from(course)
    .where(eq(course.facultyId, id));

  if (Number(courseCount[0]?.count || 0) > 0) {
    return {
      error: `Cannot delete faculty — it has ${courseCount[0].count} course(s). Remove or reassign them first.`,
    };
  }

  await db.delete(faculty).where(eq(faculty.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_faculty",
    entityType: "faculty",
    entityId: String(id),
  });

  return { success: true };
}

export async function listPrograms(facultyId: number) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.view");

  const rows = await db
    .select({
      id: program.id,
      name: program.name,
      slug: program.slug,
      facultyId: program.facultyId,
      displayOrder: program.displayOrder,
      createdAt: program.createdAt,
    })
    .from(program)
    .where(eq(program.facultyId, facultyId))
    .orderBy(asc(program.displayOrder), asc(program.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createProgram(data: {
  name: string;
  slug: string;
  facultyId: number;
}) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  const [row] = await db
    .insert(program)
    .values({
      name: data.name,
      slug: data.slug,
      facultyId: data.facultyId,
    })
    .returning({ id: program.id });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "create_program",
    entityType: "program",
    entityId: String(row.id),
    details: { name: data.name, slug: data.slug, facultyId: data.facultyId },
  });

  return { success: true, id: row.id };
}

export async function updateProgram(
  id: number,
  data: { name?: string; slug?: string }
) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  await db
    .update(program)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(program.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "update_program",
    entityType: "program",
    entityId: String(id),
    details: data,
  });

  return { success: true };
}

export async function deleteProgram(id: number) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  await db.delete(program).where(eq(program.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_program",
    entityType: "program",
    entityId: String(id),
  });

  return { success: true };
}

export async function reorderFaculties(orderedIds: number[]) {
  const session = await getAdminSession();
  requirePermission(session, "faculties.manage");

  if (orderedIds.length > 500) {
    return { error: "Too many items to reorder." };
  }

  // Update displayOrder for all faculties in a single query
  if (orderedIds.length > 0) {
    const cases = orderedIds
      .map((id, i) => sql`WHEN ${id} THEN ${i}`)
      .reduce((acc, cur) => sql`${acc} ${cur}`);
    await db.execute(
      sql`UPDATE faculty SET display_order = CASE id ${cases} END, updated_at = NOW() WHERE id = ANY(${orderedIds})`
    );
  }

  await logAdminAction({
    adminUserId: session.user.id,
    action: "reorder_faculties",
    entityType: "faculty",
    details: { orderedIds },
  });

  return { success: true };
}
