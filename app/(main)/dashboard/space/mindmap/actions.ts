"use server";

import { db } from "@/lib/db";
import { mindMap, mindMapFolder } from "@/database/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, isNull, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const MINDMAP_PATH = "/dashboard/space/mindmap";

// ==================
// Mind Map Actions
// ==================

export async function getUserMindMaps(folderId?: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const folderCondition = folderId
    ? eq(mindMap.folderId, folderId)
    : isNull(mindMap.folderId);

  return db
    .select({
      id: mindMap.id,
      name: mindMap.name,
      folderId: mindMap.folderId,
      updatedAt: mindMap.updatedAt,
      createdAt: mindMap.createdAt,
    })
    .from(mindMap)
    .where(and(eq(mindMap.userId, userId), folderCondition))
    .orderBy(desc(mindMap.updatedAt));
}

export async function createMindMap(data: { name?: string; folderId?: string }) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (data.folderId) {
    const folder = await db
      .select({ id: mindMapFolder.id })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.id, data.folderId), eq(mindMapFolder.userId, userId)))
      .limit(1);
    if (!folder[0]) throw new Error("Folder not found");
  }

  // Start with an empty canvas — user creates cards via double-click or toolbar
  const defaultNodes = "[]";

  const [row] = await db
    .insert(mindMap)
    .values({
      userId,
      name: data.name || "Untitled",
      folderId: data.folderId || null,
      nodes: defaultNodes,
      edges: "[]",
      viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
    })
    .returning({ id: mindMap.id });

  revalidatePath(MINDMAP_PATH);
  return row.id;
}

export async function getMindMap(mindMapId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select()
    .from(mindMap)
    .where(and(eq(mindMap.id, mindMapId), eq(mindMap.userId, userId)))
    .limit(1);

  return rows[0] || null;
}

export async function updateMindMap(
  mindMapId: string,
  data: {
    name?: string;
    nodes?: string;
    edges?: string;
    viewport?: string;
  }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: mindMap.id })
    .from(mindMap)
    .where(and(eq(mindMap.id, mindMapId), eq(mindMap.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Mind map not found");

  await db
    .update(mindMap)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mindMap.id, mindMapId));

  revalidatePath(MINDMAP_PATH);
}

export async function deleteMindMap(mindMapId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: mindMap.id })
    .from(mindMap)
    .where(and(eq(mindMap.id, mindMapId), eq(mindMap.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Mind map not found");

  await db.delete(mindMap).where(eq(mindMap.id, mindMapId));
  revalidatePath(MINDMAP_PATH);
}

// ==================
// Folder Actions
// ==================

export async function getUserMindMapFolders(parentId?: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const parentCondition = parentId
    ? eq(mindMapFolder.parentId, parentId)
    : isNull(mindMapFolder.parentId);

  return db
    .select({
      id: mindMapFolder.id,
      name: mindMapFolder.name,
      parentId: mindMapFolder.parentId,
      color: mindMapFolder.color,
      icon: mindMapFolder.icon,
      displayOrder: mindMapFolder.displayOrder,
      createdAt: mindMapFolder.createdAt,
      updatedAt: mindMapFolder.updatedAt,
    })
    .from(mindMapFolder)
    .where(and(eq(mindMapFolder.userId, userId), parentCondition))
    .orderBy(asc(mindMapFolder.displayOrder), asc(mindMapFolder.name));
}

export async function createMindMapFolder(data: {
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
      .select({ id: mindMapFolder.id })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.id, data.parentId), eq(mindMapFolder.userId, userId)))
      .limit(1);
    if (!parent[0]) throw new Error("Parent folder not found");
  }

  const [row] = await db
    .insert(mindMapFolder)
    .values({
      userId,
      name: data.name,
      parentId: data.parentId || null,
      color: data.color || "#5227FF",
      icon: data.icon || null,
    })
    .returning({ id: mindMapFolder.id });

  revalidatePath(MINDMAP_PATH);
  return row.id;
}

export async function deleteMindMapFolder(folderId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const rows = await db
    .select({ id: mindMapFolder.id })
    .from(mindMapFolder)
    .where(and(eq(mindMapFolder.id, folderId), eq(mindMapFolder.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new Error("Folder not found");

  // Collect all descendant folder IDs recursively
  const descendantIds: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.pop()!;
    const children = await db
      .select({ id: mindMapFolder.id })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.parentId, currentId), eq(mindMapFolder.userId, userId)));

    for (const child of children) {
      descendantIds.push(child.id);
      queue.push(child.id);
    }
  }

  // Move mind maps from all affected folders to root
  const allFolderIds = [folderId, ...descendantIds];
  for (const id of allFolderIds) {
    await db
      .update(mindMap)
      .set({ folderId: null, updatedAt: new Date() })
      .where(and(eq(mindMap.folderId, id), eq(mindMap.userId, userId)));
  }

  // Delete descendant folders
  if (descendantIds.length > 0) {
    await db.delete(mindMapFolder).where(inArray(mindMapFolder.id, descendantIds));
  }

  // Delete the target folder
  await db.delete(mindMapFolder).where(eq(mindMapFolder.id, folderId));
  revalidatePath(MINDMAP_PATH);
}

export async function moveMindMaps(mapIds: string[], targetFolderId: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (mapIds.length === 0) return;

  const owned = await db
    .select({ id: mindMap.id })
    .from(mindMap)
    .where(and(inArray(mindMap.id, mapIds), eq(mindMap.userId, userId)));

  if (owned.length !== mapIds.length) throw new Error("One or more mind maps not found");

  if (targetFolderId) {
    const folder = await db
      .select({ id: mindMapFolder.id })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.id, targetFolderId), eq(mindMapFolder.userId, userId)))
      .limit(1);
    if (!folder[0]) throw new Error("Target folder not found");
  }

  await db
    .update(mindMap)
    .set({ folderId: targetFolderId, updatedAt: new Date() })
    .where(inArray(mindMap.id, mapIds));

  revalidatePath(MINDMAP_PATH);
}

export async function moveMindMapFolders(folderIds: string[], targetFolderId: string | null) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  if (folderIds.length === 0) return;

  const owned = await db
    .select({ id: mindMapFolder.id })
    .from(mindMapFolder)
    .where(and(inArray(mindMapFolder.id, folderIds), eq(mindMapFolder.userId, userId)));

  if (owned.length !== folderIds.length) throw new Error("One or more folders not found");

  if (targetFolderId) {
    if (folderIds.includes(targetFolderId)) throw new Error("Cannot move a folder into itself");

    const target = await db
      .select({ id: mindMapFolder.id })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.id, targetFolderId), eq(mindMapFolder.userId, userId)))
      .limit(1);
    if (!target[0]) throw new Error("Target folder not found");

    // Prevent circular references
    let currentId: string | null = targetFolderId;
    const visited = new Set<string>();
    while (currentId) {
      if (folderIds.includes(currentId)) throw new Error("Cannot move a folder into one of its descendants");
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const parent = await db
        .select({ parentId: mindMapFolder.parentId })
        .from(mindMapFolder)
        .where(eq(mindMapFolder.id, currentId))
        .limit(1);
      currentId = parent[0]?.parentId ?? null;
    }
  }

  await db
    .update(mindMapFolder)
    .set({ parentId: targetFolderId, updatedAt: new Date() })
    .where(inArray(mindMapFolder.id, folderIds));

  revalidatePath(MINDMAP_PATH);
}

export async function getMindMapFolderBreadcrumbs(folderId: string) {
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
      .select({ id: mindMapFolder.id, name: mindMapFolder.name, parentId: mindMapFolder.parentId })
      .from(mindMapFolder)
      .where(and(eq(mindMapFolder.id, currentId), eq(mindMapFolder.userId, userId)))
      .limit(1);

    if (!rows[0]) throw new Error("Folder not found");

    breadcrumbs.unshift({ id: rows[0].id, name: rows[0].name });
    currentId = rows[0].parentId;
  }

  return breadcrumbs;
}
