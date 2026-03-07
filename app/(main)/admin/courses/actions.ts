"use server";

import { db } from "@/lib/db";
import { course, material, faculty } from "@/database/schema";
import { eq, sql, ilike, or, desc } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export async function listCourses({
  search,
  facultyId,
  page = 1,
  limit = 20,
}: {
  search?: string;
  facultyId?: number;
  page?: number;
  limit?: number;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "courses.view");

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = (page - 1) * safeLimit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(ilike(course.title, pattern), ilike(course.professor, pattern))!
    );
  }

  if (facultyId) {
    conditions.push(eq(course.facultyId, facultyId));
  }

  const whereClause =
    conditions.length > 0
      ? sql`${conditions.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`), sql`TRUE`)}`
      : undefined;

  const baseQuery = db
    .select({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      semester: course.semester,
      professor: course.professor,
      facultyId: course.facultyId,
      facultyName: faculty.name,
      coverImage: course.coverImage,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    })
    .from(course)
    .leftJoin(faculty, eq(course.facultyId, faculty.id));

  const countQuery = db
    .select({ count: sql<string>`count(*)` })
    .from(course);

  let rows;
  let countResult;

  if (conditions.length > 0) {
    rows = await baseQuery
      .where(
        conditions.length === 1
          ? conditions[0]
          : sql`${conditions.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`), sql`TRUE`)}`
      )
      .orderBy(desc(course.createdAt))
      .limit(safeLimit)
      .offset(offset);

    countResult = await countQuery.where(
      conditions.length === 1
        ? conditions[0]
        : sql`${conditions.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`), sql`TRUE`)}`
    );
  } else {
    rows = await baseQuery
      .orderBy(desc(course.createdAt))
      .limit(safeLimit)
      .offset(offset);

    countResult = await countQuery;
  }

  const total = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    courses: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    totalPages,
  };
}

export async function getCourse(id: string) {
  const session = await getAdminSession();
  await requirePermission(session, "courses.view");

  const rows = await db
    .select({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      major: course.major,
      semester: course.semester,
      professor: course.professor,
      facultyId: course.facultyId,
      facultyName: faculty.name,
      coverImage: course.coverImage,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      createdBy: course.createdBy,
    })
    .from(course)
    .leftJoin(faculty, eq(course.facultyId, faculty.id))
    .where(eq(course.id, id))
    .limit(1);

  if (!rows[0]) return null;

  const materials = await db
    .select({
      id: material.id,
      title: material.title,
      type: material.type,
      order: material.order,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    })
    .from(material)
    .where(eq(material.courseId, id))
    .orderBy(material.order);

  return {
    ...rows[0],
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
    materials: materials.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  };
}

export async function createCourse(data: {
  title: string;
  slug: string;
  description?: string;
  facultyId?: number;
  semester?: string;
  professor?: string;
}) {
  const session = await getAdminSession();
  await requirePermission(session, "courses.create");

  const id = crypto.randomUUID();

  await db.insert(course).values({
    id,
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    facultyId: data.facultyId || null,
    semester: data.semester || null,
    professor: data.professor || null,
    createdBy: session.user.id,
  });

  await logAdminAction({
    adminUserId: session.user.id,
    action: "create_course",
    entityType: "course",
    entityId: id,
    details: { title: data.title, slug: data.slug },
  });

  return { success: true, id };
}

export async function updateCourse(
  id: string,
  data: {
    title?: string;
    slug?: string;
    description?: string;
    facultyId?: number | null;
    semester?: string;
    professor?: string;
  }
) {
  const session = await getAdminSession();
  await requirePermission(session, "courses.edit");

  await db
    .update(course)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(course.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "update_course",
    entityType: "course",
    entityId: id,
    details: data,
  });

  return { success: true };
}

export async function deleteCourse(id: string) {
  const session = await getAdminSession();
  await requirePermission(session, "courses.delete");

  // Materials cascade on delete via schema FK
  await db.delete(course).where(eq(course.id, id));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "delete_course",
    entityType: "course",
    entityId: id,
  });

  return { success: true };
}

export async function getAllFaculties() {
  const session = await getAdminSession();
  await requirePermission(session, "courses.view");

  const rows = await db
    .select({
      id: faculty.id,
      name: faculty.name,
      slug: faculty.slug,
      university: faculty.university,
    })
    .from(faculty)
    .orderBy(faculty.name);

  return rows;
}
