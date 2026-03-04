"use server";

import { randomInt } from "crypto";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { portalPresentation, portalCode } from "@/database/schema";
import { deleteFromR2 } from "@/lib/r2";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no I/O/0/1
const CODE_LENGTH = 8;
const CODE_EXPIRY_MS = 90 * 1000; // 90 seconds

async function getSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  return session;
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function getMyPresentations() {
  const session = await getSession();

  try {
    const rows = await db
      .select()
      .from(portalPresentation)
      .where(eq(portalPresentation.userId, session.user.id))
      .orderBy(desc(portalPresentation.createdAt));

    return { presentations: rows };
  } catch {
    return { presentations: [] };
  }
}

export async function deletePresentation(id: number) {
  const session = await getSession();

  try {
    const rows = await db
      .select()
      .from(portalPresentation)
      .where(
        and(
          eq(portalPresentation.id, id),
          eq(portalPresentation.userId, session.user.id)
        )
      )
      .limit(1);

    const presentation = rows[0];
    if (!presentation) return { error: "Not found." };

    // Delete from R2
    await deleteFromR2(presentation.fileKey);

    // Delete from DB (cascade deletes codes)
    await db
      .delete(portalPresentation)
      .where(eq(portalPresentation.id, id));

    return { success: true };
  } catch {
    return { error: "Failed to delete." };
  }
}

export async function toggleApproval(id: number, requireApproval: boolean) {
  const session = await getSession();

  try {
    await db
      .update(portalPresentation)
      .set({ requireApproval })
      .where(
        and(
          eq(portalPresentation.id, id),
          eq(portalPresentation.userId, session.user.id)
        )
      );
    return { success: true };
  } catch {
    return { error: "Failed to update." };
  }
}

export async function generatePortalCode(presentationId: number) {
  const session = await getSession();

  // Verify ownership
  const rows = await db
    .select()
    .from(portalPresentation)
    .where(
      and(
        eq(portalPresentation.id, presentationId),
        eq(portalPresentation.userId, session.user.id)
      )
    )
    .limit(1);

  if (!rows[0]) return { error: "Not found." };

  // Invalidate old active codes for this presentation
  const now = new Date();
  const activeCodes = await db
    .select()
    .from(portalCode)
    .where(
      and(
        eq(portalCode.presentationId, presentationId),
        gt(portalCode.expiresAt, now),
        isNull(portalCode.usedAt)
      )
    );

  for (const c of activeCodes) {
    await db
      .update(portalCode)
      .set({ expiresAt: now })
      .where(eq(portalCode.id, c.id));
  }

  // Generate new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  const [row] = await db
    .insert(portalCode)
    .values({
      code,
      presentationId,
      userId: session.user.id,
      expiresAt,
    })
    .returning();

  return {
    code: row.code,
    codeId: row.id,
    expiresAt: row.expiresAt.toISOString(),
    requireApproval: rows[0].requireApproval,
  };
}

export async function getActiveCode(presentationId: number) {
  const session = await getSession();

  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(portalCode)
      .where(
        and(
          eq(portalCode.presentationId, presentationId),
          eq(portalCode.userId, session.user.id),
          gt(portalCode.expiresAt, now),
          isNull(portalCode.usedAt)
        )
      )
      .orderBy(desc(portalCode.createdAt))
      .limit(1);

    const active = rows[0];
    if (!active) return { active: null };

    return {
      active: {
        id: active.id,
        code: active.code,
        expiresAt: active.expiresAt.toISOString(),
        requestedAt: active.requestedAt?.toISOString() || null,
        approved: active.approved,
      },
    };
  } catch {
    return { active: null };
  }
}

export async function approvePortalAccess(codeId: number) {
  const session = await getSession();

  try {
    await db
      .update(portalCode)
      .set({ approved: true, approvedAt: new Date(), usedAt: new Date() })
      .where(
        and(eq(portalCode.id, codeId), eq(portalCode.userId, session.user.id))
      );
    return { success: true };
  } catch {
    return { error: "Failed to approve." };
  }
}

export async function rejectPortalAccess(codeId: number) {
  const session = await getSession();

  try {
    await db
      .update(portalCode)
      .set({ approved: false, usedAt: new Date() })
      .where(
        and(eq(portalCode.id, codeId), eq(portalCode.userId, session.user.id))
      );
    return { success: true };
  } catch {
    return { error: "Failed to reject." };
  }
}
