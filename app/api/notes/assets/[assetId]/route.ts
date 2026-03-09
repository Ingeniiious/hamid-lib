import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { noteAsset } from "@/database/schema";
import { and, eq } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;

  // Find the asset, ensure it belongs to the user
  const [asset] = await db
    .select()
    .from(noteAsset)
    .where(and(eq(noteAsset.id, assetId), eq(noteAsset.userId, session.user.id)))
    .limit(1);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Delete from R2 (best-effort)
  await deleteFromR2(asset.objectKey);

  // Delete from DB
  await db.delete(noteAsset).where(eq(noteAsset.id, assetId));

  return NextResponse.json({ success: true });
}
