import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { noteAsset } from "@/database/schema";
import { uploadToR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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

  // Rate limit: 10 uploads per minute
  const ip = getClientIP(req);
  const rl = await rateLimit(`notes:upload:${ip}`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
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
      { error: "File must be under 10MB." },
      { status: 400 }
    );
  }

  // Optimize: resize to max 2048px, convert to WebP, strip metadata
  const buffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(buffer)
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Content-hash filename for deduplication
  const hash = createHash("sha256").update(compressed).digest("hex").slice(0, 16);
  const objectKey = `notes/${session.user.id}/${hash}.webp`;

  const result = await uploadToR2(new Uint8Array(compressed), objectKey, "image/webp");
  if (!result.success) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  // Record asset in database
  await db.insert(noteAsset).values({
    userId: session.user.id,
    url: result.url,
    objectKey,
    fileName: file.name,
    fileSize: compressed.length,
  });

  return NextResponse.json({ url: result.url });
}
