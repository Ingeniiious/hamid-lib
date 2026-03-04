import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portalPresentation } from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_FILES_PER_USER = 5;
const MAX_STORAGE_PER_USER = 100 * 1024 * 1024; // 100MB total per user

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

// Map MIME type to file extension
function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
  };
  return map[mime] || "";
}

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
  }

  // Enforce per-user limits (file count + total storage)
  const [usage] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${portalPresentation.fileSize}), 0)::int`,
    })
    .from(portalPresentation)
    .where(eq(portalPresentation.userId, session.user.id));

  if (usage.count >= MAX_FILES_PER_USER) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_FILES_PER_USER} files. Delete one to upload more.` },
      { status: 400 }
    );
  }

  if (usage.totalSize + file.size > MAX_STORAGE_PER_USER) {
    const usedMB = (usage.totalSize / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `Storage limit reached (${usedMB}/100 MB). Delete files to free up space.` },
      { status: 400 }
    );
  }

  // Hash the object key — no userId or filename in the path
  const hash = randomBytes(32).toString("hex");
  const ext = getExtension(file.type);
  const objectKey = `portal/${hash}${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const result = await uploadToR2(buffer, objectKey, file.type);

  if (!result.success) {
    console.error("R2 upload failed:", result.error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const [row] = await db
    .insert(portalPresentation)
    .values({
      userId: session.user.id,
      fileName: file.name,
      fileKey: objectKey,
      fileUrl: result.url,
      fileSize: file.size,
      fileType: file.type,
    })
    .returning();

  return NextResponse.json({ presentation: row });
}
