import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contributorVerification, enrollmentVerification, professor } from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`enrollment-upload:${session.user.id}`, 10, 86400);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions today. Try again tomorrow." },
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
      { error: "You must verify your university email first." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const professorId = Number(formData.get("professorId"));
  const courseName = (formData.get("courseName") as string)?.trim();
  const semester = (formData.get("semester") as string)?.trim();

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!professorId || !courseName || !semester) {
    return NextResponse.json(
      { error: "Professor, course name, and semester are required." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Max 10MB." },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and image files (PNG, JPG, WebP) are accepted." },
      { status: 400 }
    );
  }

  // Check professor exists
  const [prof] = await db
    .select({ id: professor.id })
    .from(professor)
    .where(eq(professor.id, professorId))
    .limit(1);
  if (!prof) {
    return NextResponse.json({ error: "Professor not found." }, { status: 404 });
  }

  // Check for existing approved or pending
  const [existing] = await db
    .select({ id: enrollmentVerification.id, status: enrollmentVerification.status })
    .from(enrollmentVerification)
    .where(
      and(
        eq(enrollmentVerification.userId, session.user.id),
        eq(enrollmentVerification.professorId, professorId)
      )
    )
    .limit(1);

  if (existing?.status === "approved") {
    return NextResponse.json(
      { error: "Your enrollment is already verified." },
      { status: 400 }
    );
  }
  if (existing?.status === "pending") {
    return NextResponse.json(
      { error: "You already have a pending verification." },
      { status: 400 }
    );
  }

  // Upload proof to R2
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const hash = randomBytes(16).toString("hex");
  const ext = file.type === "application/pdf" ? ".pdf" : file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const objectKey = `enrollment-proofs/${session.user.id}/${hash}${ext}`;

  const result = await uploadToR2(fileBuffer, objectKey, file.type);
  if (!result.success) {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Insert or update (resubmission after rejection)
  if (existing) {
    await db
      .update(enrollmentVerification)
      .set({
        courseName,
        semester,
        proofFileKey: objectKey,
        proofFileUrl: result.url,
        proofFileName: file.name,
        proofFileSize: file.size,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date(),
      })
      .where(eq(enrollmentVerification.id, existing.id));
  } else {
    await db.insert(enrollmentVerification).values({
      userId: session.user.id,
      professorId,
      courseName,
      semester,
      proofFileKey: objectKey,
      proofFileUrl: result.url,
      proofFileName: file.name,
      proofFileSize: file.size,
    });
  }

  return NextResponse.json({ success: true });
}
