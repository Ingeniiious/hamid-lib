import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  contribution,
  contributorVerification,
  contributorStats,
} from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
import { watermarkFile } from "@/lib/watermark";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PENDING_PER_USER = 20;
const MAX_STORAGE_PER_USER = 500 * 1024 * 1024; // 500MB total

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "text/plain": ".txt",
  };
  return map[mime] || "";
}

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(
    `contribute-upload:${session.user.id}`,
    10,
    60
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429 }
    );
  }

  // Check contributor verification
  const [verified] = await db
    .select()
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (!verified) {
    return NextResponse.json(
      { error: "Not verified as a contributor." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string)?.trim();
  const courseId = (formData.get("courseId") as string) || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Max 50MB." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed." },
      { status: 400 }
    );
  }

  // Check per-user limits
  const [usage] = await db
    .select({
      pendingCount: sql<number>`count(*) FILTER (WHERE ${contribution.status} = 'pending')::int`,
      totalSize: sql<number>`coalesce(sum(${contribution.fileSize}), 0)::int`,
    })
    .from(contribution)
    .where(eq(contribution.userId, session.user.id));

  if (usage.pendingCount >= MAX_PENDING_PER_USER) {
    return NextResponse.json(
      {
        error: `You have ${MAX_PENDING_PER_USER} pending contributions. Wait for review before submitting more.`,
      },
      { status: 400 }
    );
  }

  if (usage.totalSize + file.size > MAX_STORAGE_PER_USER) {
    return NextResponse.json(
      { error: "Storage limit reached (500MB). Some contributions need to be reviewed first." },
      { status: 400 }
    );
  }

  // Watermark the file
  const rawBuffer = new Uint8Array(await file.arrayBuffer());
  const { buffer: watermarkedBuffer, mimeType: finalMime } =
    await watermarkFile(rawBuffer, file.type);

  // Upload to R2
  const hash = randomBytes(32).toString("hex");
  const ext = getExtension(finalMime);
  const objectKey = `contributions/${hash}${ext}`;

  const result = await uploadToR2(watermarkedBuffer, objectKey, finalMime);
  if (!result.success) {
    console.error("R2 upload failed:", result.error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Insert contribution record
  const [row] = await db
    .insert(contribution)
    .values({
      userId: session.user.id,
      courseId: courseId || null,
      title,
      description,
      type: "file",
      fileKey: objectKey,
      fileUrl: result.url,
      fileName: file.name,
      fileSize: watermarkedBuffer.length,
      fileType: finalMime,
    })
    .returning();

  // Update contributor stats
  await db
    .update(contributorStats)
    .set({
      totalContributions: sql`${contributorStats.totalContributions} + 1`,
      lastContributionAt: new Date(),
      firstContributionAt: sql`COALESCE(${contributorStats.firstContributionAt}, NOW())`,
      updatedAt: new Date(),
    })
    .where(eq(contributorStats.userId, session.user.id));

  return NextResponse.json({ contribution: row });
}
