import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { contribution } from "@/database/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET — List recent test-lab files for reuse.
 * Returns the 20 most recent contributions from the __test_lab__ course.
 */
export async function GET() {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await db
    .select({
      id: contribution.id,
      fileName: contribution.fileName,
      fileType: contribution.fileType,
      fileSize: contribution.fileSize,
      fileUrl: contribution.fileUrl,
      createdAt: contribution.createdAt,
    })
    .from(contribution)
    .where(
      and(
        eq(contribution.courseId, "__test_lab__"),
        eq(contribution.type, "file")
      )
    )
    .orderBy(desc(contribution.createdAt))
    .limit(20);

  return NextResponse.json({ files });
}
