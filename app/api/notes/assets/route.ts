import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { noteAsset } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await db
    .select()
    .from(noteAsset)
    .where(eq(noteAsset.userId, session.user.id))
    .orderBy(desc(noteAsset.createdAt))
    .limit(50);

  return NextResponse.json({ assets });
}
