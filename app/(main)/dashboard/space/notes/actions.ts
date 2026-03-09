"use server";

import { db } from "@/lib/db";
import { note, noteFolder } from "@/database/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, isNull, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ==================
// Note Actions
// ==================

export async function getUserNotes(folderId?: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const folderCondition = folderId
    ? eq(note.folderId, folderId)
    : isNull(note.folderId);

  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      folderId: note.folderId,
      paperStyle: note.paperStyle,
      paperColor: note.paperColor,
      font: note.font,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    })
    .from(note)
    .where(and(eq(note.userId, userId), folderCondition))
    .orderBy(desc(note.updatedAt));

  return rows;
}

export async function createNote(data: {
  title?: string;
  folderId?: string;
  paperStyle?: string;
  paperColor?: string;
  paperSize?: string;
  lineAlign?: string;
  font?: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // If folderId is provided, verify folder belongs to the user
  if (data.folderId) {
    const folder = await db
      .select({ id: noteFolder.id })
      .from(noteFolder)
      .where(and(eq(noteFolder.id, data.folderId), eq(noteFolder.userId, userId)))
      .limit(1);
    if (!folder[0]) throw new Error("Folder not found");
  }

  const [row] = await db
    .insert(note)
    .values({
      userId,
      title: data.title || "Untitled",
      folderId: data.folderId || null,
      paperStyle: data.paperStyle || "blank",
      paperColor: data.paperColor || "#ffffff",
      paperSize: data.paperSize || "a4",
      lineAlign: data.lineAlign || "between",
      font: data.font || "default",
    })
    .returning({ id: note.id });

  revalidatePath("/dashboard/space/notes");

  return row.id;
}

export async function getNote(noteId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select()
    .from(note)
    .where(and(eq(note.id, noteId), eq(note.userId, userId)))
    .limit(1);

  if (!rows[0]) return null;

  return rows[0];
}

export async function updateNote(
  noteId: string,
  data: {
    title?: string;
    content?: string;
    paperStyle?: string;
    paperColor?: string;
    paperSize?: string;
    lineAlign?: string;
    font?: string;
  }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: note.id })
    .from(note)
    .where(and(eq(note.id, noteId), eq(note.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Note not found");

  await db
    .update(note)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(note.id, noteId));

  revalidatePath("/dashboard/space/notes");
}

export async function deleteNote(noteId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: note.id })
    .from(note)
    .where(and(eq(note.id, noteId), eq(note.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Note not found");

  await db.delete(note).where(eq(note.id, noteId));

  revalidatePath("/dashboard/space/notes");
}

// ==================
// Folder Actions
// ==================

export async function getUserFolders(parentId?: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parentCondition = parentId
    ? eq(noteFolder.parentId, parentId)
    : isNull(noteFolder.parentId);

  const rows = await db
    .select({
      id: noteFolder.id,
      name: noteFolder.name,
      parentId: noteFolder.parentId,
      color: noteFolder.color,
      icon: noteFolder.icon,
      displayOrder: noteFolder.displayOrder,
      createdAt: noteFolder.createdAt,
      updatedAt: noteFolder.updatedAt,
    })
    .from(noteFolder)
    .where(and(eq(noteFolder.userId, userId), parentCondition))
    .orderBy(asc(noteFolder.displayOrder), asc(noteFolder.name));

  return rows;
}

export async function createFolder(data: {
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (data.parentId) {
    const parent = await db
      .select({ id: noteFolder.id })
      .from(noteFolder)
      .where(and(eq(noteFolder.id, data.parentId), eq(noteFolder.userId, userId)))
      .limit(1);
    if (!parent[0]) throw new Error("Parent folder not found");
  }

  const [row] = await db
    .insert(noteFolder)
    .values({
      userId,
      name: data.name,
      parentId: data.parentId || null,
      color: data.color || "#5227FF",
      icon: data.icon || null,
    })
    .returning({ id: noteFolder.id });

  revalidatePath("/dashboard/space/notes");

  return row.id;
}

export async function updateFolder(
  folderId: string,
  data: {
    name?: string;
    color?: string;
    icon?: string;
    displayOrder?: number;
  }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: noteFolder.id })
    .from(noteFolder)
    .where(and(eq(noteFolder.id, folderId), eq(noteFolder.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Folder not found");

  await db
    .update(noteFolder)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(noteFolder.id, folderId));

  revalidatePath("/dashboard/space/notes");
}

export async function deleteFolder(folderId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: noteFolder.id })
    .from(noteFolder)
    .where(and(eq(noteFolder.id, folderId), eq(noteFolder.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Folder not found");

  // Collect all descendant folder IDs recursively
  const descendantIds: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.pop()!;
    const children = await db
      .select({ id: noteFolder.id })
      .from(noteFolder)
      .where(and(eq(noteFolder.parentId, currentId), eq(noteFolder.userId, userId)));

    for (const child of children) {
      descendantIds.push(child.id);
      queue.push(child.id);
    }
  }

  // Move notes from all affected folders to root
  const allFolderIds = [folderId, ...descendantIds];
  for (const id of allFolderIds) {
    await db
      .update(note)
      .set({ folderId: null, updatedAt: new Date() })
      .where(and(eq(note.folderId, id), eq(note.userId, userId)));
  }

  // Delete descendant folders
  if (descendantIds.length > 0) {
    await db
      .delete(noteFolder)
      .where(inArray(noteFolder.id, descendantIds));
  }

  // Delete the target folder
  await db.delete(noteFolder).where(eq(noteFolder.id, folderId));

  revalidatePath("/dashboard/space/notes");
}

export async function moveNotes(noteIds: string[], targetFolderId: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (noteIds.length === 0) return;

  const ownedNotes = await db
    .select({ id: note.id })
    .from(note)
    .where(and(inArray(note.id, noteIds), eq(note.userId, userId)));

  if (ownedNotes.length !== noteIds.length) {
    throw new Error("One or more notes not found");
  }

  if (targetFolderId) {
    const folder = await db
      .select({ id: noteFolder.id })
      .from(noteFolder)
      .where(and(eq(noteFolder.id, targetFolderId), eq(noteFolder.userId, userId)))
      .limit(1);
    if (!folder[0]) throw new Error("Target folder not found");
  }

  await db
    .update(note)
    .set({ folderId: targetFolderId, updatedAt: new Date() })
    .where(inArray(note.id, noteIds));

  revalidatePath("/dashboard/space/notes");
}

export async function moveFolders(folderIds: string[], targetFolderId: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (folderIds.length === 0) return;

  const ownedFolders = await db
    .select({ id: noteFolder.id })
    .from(noteFolder)
    .where(and(inArray(noteFolder.id, folderIds), eq(noteFolder.userId, userId)));

  if (ownedFolders.length !== folderIds.length) {
    throw new Error("One or more folders not found");
  }

  if (targetFolderId) {
    if (folderIds.includes(targetFolderId)) {
      throw new Error("Cannot move a folder into itself");
    }

    const targetFolder = await db
      .select({ id: noteFolder.id })
      .from(noteFolder)
      .where(and(eq(noteFolder.id, targetFolderId), eq(noteFolder.userId, userId)))
      .limit(1);
    if (!targetFolder[0]) throw new Error("Target folder not found");

    // Prevent circular references
    let currentId: string | null = targetFolderId;
    const visited = new Set<string>();

    while (currentId) {
      if (folderIds.includes(currentId)) {
        throw new Error("Cannot move a folder into one of its descendants");
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = await db
        .select({ parentId: noteFolder.parentId })
        .from(noteFolder)
        .where(eq(noteFolder.id, currentId))
        .limit(1);

      currentId = parent[0]?.parentId ?? null;
    }
  }

  await db
    .update(noteFolder)
    .set({ parentId: targetFolderId, updatedAt: new Date() })
    .where(inArray(noteFolder.id, folderIds));

  revalidatePath("/dashboard/space/notes");
}

export async function getFolderBreadcrumbs(folderId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const breadcrumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const rows = await db
      .select({ id: noteFolder.id, name: noteFolder.name, parentId: noteFolder.parentId })
      .from(noteFolder)
      .where(and(eq(noteFolder.id, currentId), eq(noteFolder.userId, userId)))
      .limit(1);

    if (!rows[0]) throw new Error("Folder not found");

    breadcrumbs.unshift({ id: rows[0].id, name: rows[0].name });
    currentId = rows[0].parentId;
  }

  return breadcrumbs;
}
