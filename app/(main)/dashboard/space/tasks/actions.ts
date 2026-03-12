"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { task, course } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";

async function getSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  return session;
}

export async function getTasks() {
  const session = await getSession();

  const tasks = await db
    .select()
    .from(task)
    .where(eq(task.userId, session.user.id))
    .orderBy(desc(task.createdAt));

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    dueDate: t.dueDate || undefined,
    courseId: t.courseId || undefined,
    priority: t.priority as "low" | "medium" | "high",
    status: t.status as "pending" | "completed",
    subtasks: (t.subtasks as { id: string; title: string; completed: boolean }[] | null) || [],
    reminder: t.reminder as "none" | "at_deadline" | "daily" | "weekly",
    notify: t.notify,
    displayOrder: t.displayOrder,
    completedAt: t.completedAt?.toISOString() || undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function getUserCourses() {
  const courses = await db
    .select({ id: course.id, title: course.title })
    .from(course)
    .orderBy(course.title);

  return courses;
}

export async function addTask(data: {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  courseId?: string;
  priority: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  reminder: string;
  notify: boolean;
}) {
  const session = await getSession();

  await db.insert(task).values({
    id: data.id,
    userId: session.user.id,
    title: data.title,
    description: data.description || null,
    dueDate: data.dueDate || null,
    courseId: data.courseId || null,
    priority: data.priority,
    subtasks: data.subtasks && data.subtasks.length > 0 ? data.subtasks : null,
    reminder: data.reminder,
    notify: data.notify,
  });

  return { success: true };
}

export async function updateTask(
  taskId: string,
  data: {
    title: string;
    description?: string;
    dueDate?: string;
    courseId?: string;
    priority: string;
    subtasks?: { id: string; title: string; completed: boolean }[];
    reminder: string;
    notify: boolean;
  }
) {
  const session = await getSession();

  await db
    .update(task)
    .set({
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate || null,
      courseId: data.courseId || null,
      priority: data.priority,
      subtasks: data.subtasks && data.subtasks.length > 0 ? data.subtasks : null,
      reminder: data.reminder,
      notify: data.notify,
      updatedAt: new Date(),
    })
    .where(and(eq(task.id, taskId), eq(task.userId, session.user.id)));

  return { success: true };
}

export async function toggleTaskComplete(taskId: string, completed: boolean) {
  const session = await getSession();

  await db
    .update(task)
    .set({
      status: completed ? "completed" : "pending",
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(task.id, taskId), eq(task.userId, session.user.id)));

  return { success: true };
}

export async function toggleSubtaskComplete(
  taskId: string,
  subtaskId: string,
  completed: boolean
) {
  const session = await getSession();

  const [existing] = await db
    .select({ subtasks: task.subtasks })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.userId, session.user.id)));

  if (!existing) return { success: false };

  const subtasks = (existing.subtasks as { id: string; title: string; completed: boolean }[] | null) || [];
  const updated = subtasks.map((s) =>
    s.id === subtaskId ? { ...s, completed } : s
  );

  await db
    .update(task)
    .set({ subtasks: updated, updatedAt: new Date() })
    .where(and(eq(task.id, taskId), eq(task.userId, session.user.id)));

  return { success: true };
}

export async function deleteTask(taskId: string) {
  const session = await getSession();

  await db
    .delete(task)
    .where(and(eq(task.id, taskId), eq(task.userId, session.user.id)));

  return { success: true };
}
