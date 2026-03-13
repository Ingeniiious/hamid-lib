import { createHash } from "crypto";
import { db } from "@/lib/db";
import { contribution } from "@/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * Compute SHA-256 hash of raw file content (before watermark).
 */
export function computeContentHash(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compute SHA-256 hash of text content (normalized).
 */
export function computeTextHash(text: string): string {
  return createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");
}

/**
 * Check if a contribution with the same content hash already exists.
 *
 * Rules:
 * - Same hash + same courseId → reject ("already contributed for this course")
 * - Same hash + same courseId + previously AI-rejected → reject with original reason
 * - Same hash + different courseId → allow (same material valid for multiple courses)
 * - Same hash + different userId + same courseId → allow but flag
 */
export async function checkDuplicate(
  hash: string,
  courseId: string | null,
  userId: string
): Promise<{
  isDuplicate: boolean;
  reason?: string;
  existingId?: number;
}> {
  if (!courseId) {
    // No course context — can't check for course-level duplicates
    return { isDuplicate: false };
  }

  // Find existing contribution with same hash and same course
  const [existing] = await db
    .select({
      id: contribution.id,
      userId: contribution.userId,
      status: contribution.status,
      rejectionSource: contribution.rejectionSource,
      rejectionReason: contribution.rejectionReason,
    })
    .from(contribution)
    .where(
      and(
        eq(contribution.contentHash, hash),
        eq(contribution.courseId, courseId)
      )
    )
    .limit(1);

  if (!existing) {
    return { isDuplicate: false };
  }

  // Same user, same course, same content → always reject
  if (existing.userId === userId) {
    // If previously AI-rejected, include original reason
    if (existing.status === "rejected" && existing.rejectionSource === "ai") {
      return {
        isDuplicate: true,
        reason: `You already contributed this content for this course, and it was previously rejected: ${existing.rejectionReason || "Content validation failed"}`,
        existingId: existing.id,
      };
    }
    return {
      isDuplicate: true,
      reason: "You have already contributed this exact content for this course.",
      existingId: existing.id,
    };
  }

  // Different user, same course, same content → allow but it's flagged via contentHash
  return { isDuplicate: false };
}
