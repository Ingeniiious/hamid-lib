"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { contentReport, contribution } from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";

export async function submitReport({
  contributionId,
  reason,
  description,
}: {
  contributionId: number;
  reason: "fake" | "incorrect" | "copyright" | "other";
  description?: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`report:${session.user.id}`, 10, 300);
  if (!rl.allowed) return { error: "Too many reports. Please wait." };

  // Check contribution exists
  const [c] = await db
    .select({ id: contribution.id, status: contribution.status })
    .from(contribution)
    .where(eq(contribution.id, contributionId))
    .limit(1);
  if (!c) return { error: "Contribution not found." };

  // Prevent duplicate reports from same user
  const [existing] = await db
    .select({ id: contentReport.id })
    .from(contentReport)
    .where(
      and(
        eq(contentReport.contributionId, contributionId),
        eq(contentReport.reporterId, session.user.id)
      )
    )
    .limit(1);
  if (existing) return { error: "You've already reported this contribution." };

  // Insert report
  await db.insert(contentReport).values({
    contributionId,
    reporterId: session.user.id,
    reason,
    description: description?.trim() || null,
  });

  // Increment report count on contribution
  await db
    .update(contribution)
    .set({
      reportCount: sql`${contribution.reportCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(contribution.id, contributionId));

  // Auto-flag threshold: 3+ pending reports → under_review
  const [reportCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contentReport)
    .where(
      and(
        eq(contentReport.contributionId, contributionId),
        eq(contentReport.status, "pending")
      )
    );

  if (reportCount.count >= 3 && c.status !== "under_review") {
    await db
      .update(contribution)
      .set({ status: "under_review", updatedAt: new Date() })
      .where(eq(contribution.id, contributionId));
  }

  return { success: true };
}

export async function uploadReportEvidence(formData: FormData) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id)
    return { error: "Not authenticated." };

  const file = formData.get("file") as File | null;
  const reportId = formData.get("reportId") as string;
  if (!file || !reportId) return { error: "Missing file or report ID." };

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Evidence file too large. Max 10MB." };
  }

  const { randomBytes } = await import("crypto");
  const { uploadToR2 } = await import("@/lib/r2");

  const hash = randomBytes(32).toString("hex");
  const ext =
    file.type === "application/pdf" ? ".pdf" : file.type.startsWith("image/") ? ".png" : "";
  const objectKey = `reports/${hash}${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const result = await uploadToR2(buffer, objectKey, file.type);
  if (!result.success) return { error: "Upload failed." };

  await db
    .update(contentReport)
    .set({
      evidenceFileKey: objectKey,
      evidenceFileUrl: result.url,
      evidenceFileName: file.name,
      evidenceFileSize: buffer.length,
    })
    .where(
      and(
        eq(contentReport.id, parseInt(reportId)),
        eq(contentReport.reporterId, session.user.id)
      )
    );

  return { success: true };
}
