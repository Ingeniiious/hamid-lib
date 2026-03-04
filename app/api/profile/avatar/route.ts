import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 req / 1 min
  const ip = getClientIP(req);
  const rl = await rateLimit(`avatar:upload:${ip}`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 5MB." },
      { status: 400 }
    );
  }

  // Compress to 256x256 WebP
  const buffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(buffer)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  // Hashed filename
  const hash = createHash("sha256").update(compressed).digest("hex").slice(0, 16);
  const objectKey = `avatars/${hash}.webp`;

  // Upload to R2
  const result = await uploadToR2(new Uint8Array(compressed), objectKey, "image/webp");
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Delete old custom avatar if exists
  const existing = await db
    .select({ avatarKey: userProfile.avatarKey })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  if (existing[0]?.avatarKey && existing[0].avatarKey !== objectKey) {
    await deleteFromR2(existing[0].avatarKey);
  }

  // Upsert profile
  if (existing[0]) {
    await db
      .update(userProfile)
      .set({ avatarUrl: result.url, avatarKey: objectKey, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id));
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      avatarUrl: result.url,
      avatarKey: objectKey,
    });
  }

  return NextResponse.json({ url: result.url });
}

export async function DELETE(req: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db
    .select({ avatarKey: userProfile.avatarKey })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  if (existing[0]?.avatarKey) {
    await deleteFromR2(existing[0].avatarKey);
    await db
      .update(userProfile)
      .set({ avatarUrl: null, avatarKey: null, updatedAt: new Date() })
      .where(eq(userProfile.userId, session.user.id));
  }

  return NextResponse.json({ success: true });
}
