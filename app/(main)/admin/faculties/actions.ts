"use server";

import { db } from "@/lib/db";
import { faculty, program, course } from "@/database/schema";
import { eq, asc, sql, count, or, ilike } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

// ── Overview stats (single query) ──

export async function getFacultyStats() {
  const session = await getAdminSession();
  await requirePermission(session, "faculties.view");

  const [stats] = await db.execute<{
    total_faculties: string;
    total_programs: string;
    total_universities: string;
    total_courses: string;
  }>(sql`
    SELECT
      (SELECT count(*) FROM faculty) as total_faculties,
      (SELECT count(*) FROM program) as total_programs,
      (SELECT count(DISTINCT university) FROM faculty) as total_universities,
      (SELECT count(*) FROM course WHERE faculty_id IS NOT NULL) as total_courses
  `);

  return {
    totalFaculties: parseInt(stats.total_faculties),
    totalPrograms: parseInt(stats.total_programs),
    totalUniversities: parseInt(stats.total_universities),
    totalCourses: parseInt(stats.total_courses),
  };
}

// ── Faculties (paginated, single query with window count) ──

interface ListFacultiesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listFaculties({
  search,
  page = 1,
  limit = 20,
}: ListFacultiesParams = {}) {
  const session = await getAdminSession();
  await requirePermission(session, "faculties.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  const searchCondition = search
    ? or(
        ilike(faculty.name, `%${search}%`),
        ilike(faculty.university, `%${search}%`),
        ilike(faculty.slug, `%${search}%`)
      )
    : undefined;

  // Single query: data + counts + total via window function
  const rows = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      slug: faculty.slug,
      university: faculty.university,
      description: faculty.description,
      displayOrder: faculty.displayOrder,
      createdAt: faculty.createdAt,
      programCount: sql<number>`(SELECT count(*)::int FROM program WHERE program.faculty_id = "faculty"."id")`,
      courseCount: sql<number>`(SELECT count(*)::int FROM course WHERE course.faculty_id = "faculty"."id")`,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(faculty)
    .where(searchCondition)
    .orderBy(asc(faculty.displayOrder), asc(faculty.name))
    .limit(safeLimit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  return {
    faculties: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

// ── Programs (paginated, single query with window count) ──

interface ListProgramsParams {
  facultyId: number;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listPrograms({
  facultyId,
  search,
  page = 1,
  limit = 20,
}: ListProgramsParams) {
  const session = await getAdminSession();
  await requirePermission(session, "faculties.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  const conditions = search
    ? sql`${program.facultyId} = ${facultyId} AND (${program.name} ILIKE ${`%${search}%`} OR ${program.slug} ILIKE ${`%${search}%`})`
    : eq(program.facultyId, facultyId);

  const rows = await db
    .select({
      id: program.id,
      name: program.name,
      slug: program.slug,
      facultyId: program.facultyId,
      displayOrder: program.displayOrder,
      createdAt: program.createdAt,
      totalCount: sql<number>`count(*) OVER()`,
    })
    .from(program)
    .where(conditions)
    .orderBy(asc(program.displayOrder), asc(program.name))
    .limit(safeLimit)
    .offset(offset);

  const total = rows[0]?.totalCount ?? 0;

  return {
    programs: rows.map(({ totalCount: _, ...r }) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

// ── Faculty CRUD ──

export async function createFaculty(data: {
  name: string;
  slug: string;
  university: string;
  description?: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "faculties.manage");

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
  await requirePermission(session, "faculties.manage");

  await db
    .update(faculty)
    .set({
      name: data.name,
      slug: data.slug,
      university: data.university,
      description: data.description,
      updatedAt: new Date(),
    })
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
  await requirePermission(session, "faculties.manage");

  const [courseCount] = await db
    .select({ count: count() })
    .from(course)
    .where(eq(course.facultyId, id));

  if (courseCount.count > 0) {
    return {
      error: `Cannot delete — faculty has ${courseCount.count} course(s). Remove or reassign them first.`,
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

// ── Program CRUD ──

export async function createProgram(data: {
  name: string;
  slug: string;
  facultyId: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "faculties.manage");

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
  await requirePermission(session, "faculties.manage");

  await db
    .update(program)
    .set({
      name: data.name,
      slug: data.slug,
      updatedAt: new Date(),
    })
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
  await requirePermission(session, "faculties.manage");

  await db.delete(program).where(eq(program.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_program",
    entityType: "program",
    entityId: String(id),
  });

  return { success: true };
}
