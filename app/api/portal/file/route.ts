import { db } from "@/lib/db";
import { portalCode, portalPresentation } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies file downloads through our server instead of exposing CDN URLs.
 * Validates that the portal code was approved before serving the file.
 * Query params: ?codeId=123
 */
export async function GET(request: NextRequest) {
  const codeId = request.nextUrl.searchParams.get("codeId");

  if (!codeId) {
    return NextResponse.json({ error: "Missing codeId." }, { status: 400 });
  }

  // Look up the code and verify it was approved
  const rows = await db
    .select({
      code: portalCode,
      presentation: portalPresentation,
    })
    .from(portalCode)
    .innerJoin(
      portalPresentation,
      eq(portalCode.presentationId, portalPresentation.id)
    )
    .where(
      and(
        eq(portalCode.id, parseInt(codeId, 10)),
        eq(portalCode.approved, true)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // Fetch file from R2 CDN and proxy it
  try {
    const upstream = await fetch(row.presentation.fileUrl);
    if (!upstream.ok) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", row.presentation.fileType);
    headers.set("Content-Length", row.presentation.fileSize.toString());
    const safeName = row.presentation.fileName
      .replace(/[^\w\s.\-()]/g, "_")
      .slice(0, 200);
    headers.set(
      "Content-Disposition",
      `inline; filename="${safeName}"`
    );
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Failed to fetch file." }, { status: 500 });
  }
}
