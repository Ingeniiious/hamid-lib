"use server";

import { eq, and, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { portalCode, portalPresentation } from "@/database/schema";
import { rateLimit } from "@/lib/rate-limit";

function getClientIP(headersList: Headers): string {
  return (
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function verifyPortalCode(code: string) {
  const normalized = code.toUpperCase().trim();

  if (normalized.length !== 8) {
    return { error: "Invalid code." };
  }

  // Rate limit: 10 requests per minute per IP
  const headersList = await headers();
  const ip = getClientIP(headersList);
  const { allowed, retryAfter } = await rateLimit(`portal:verify:${ip}`, 10, 60);
  if (!allowed) {
    return { error: `Too many attempts. Try again in ${retryAfter}s.` };
  }

  try {
    const now = new Date();
    const rows = await db
      .select({
        code: portalCode,
        presentation: portalPresentation,
      })
      .from(portalCode)
      .innerJoin(
        portalPresentation,
        eq(portalCode.presentationId, portalPresentation.id)
      )
      .where(eq(portalCode.code, normalized))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return { error: "Invalid code." };
    }

    // Check if expired
    if (row.code.expiresAt <= now) {
      return { error: "Code expired." };
    }

    // Check if already used
    if (row.code.usedAt) {
      return { error: "Code already used." };
    }

    // If 2-step approval is required
    if (row.presentation.requireApproval) {
      // Mark as requested (if not already)
      if (!row.code.requestedAt) {
        await db
          .update(portalCode)
          .set({ requestedAt: now })
          .where(eq(portalCode.id, row.code.id));
      }

      return {
        status: "pending_approval" as const,
        codeId: row.code.id,
        fileName: row.presentation.fileName,
      };
    }

    // No approval needed — mark as used and return file URL
    await db
      .update(portalCode)
      .set({ usedAt: now, approved: true })
      .where(eq(portalCode.id, row.code.id));

    return {
      status: "approved" as const,
      codeId: row.code.id,
      fileName: row.presentation.fileName,
      fileUrl: row.presentation.fileUrl,
      fileType: row.presentation.fileType,
      fileSize: row.presentation.fileSize,
    };
  } catch {
    return { error: "Something went wrong." };
  }
}

export async function checkApprovalStatus(codeId: number) {
  try {
    const rows = await db
      .select({
        code: portalCode,
        presentation: portalPresentation,
      })
      .from(portalCode)
      .innerJoin(
        portalPresentation,
        eq(portalCode.presentationId, portalPresentation.id)
      )
      .where(eq(portalCode.id, codeId))
      .limit(1);

    const row = rows[0];
    if (!row) return { error: "Not found." };

    // Check if expired
    if (row.code.expiresAt <= new Date()) {
      return { status: "expired" as const };
    }

    // Check approval status
    if (row.code.approved === true) {
      return {
        status: "approved" as const,
        fileName: row.presentation.fileName,
        fileUrl: row.presentation.fileUrl,
        fileType: row.presentation.fileType,
        fileSize: row.presentation.fileSize,
      };
    }

    if (row.code.approved === false) {
      return { status: "rejected" as const };
    }

    // Still pending
    return { status: "pending" as const };
  } catch {
    return { error: "Something went wrong." };
  }
}
