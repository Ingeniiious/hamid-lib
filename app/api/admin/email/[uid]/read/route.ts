import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { markAsRead } from "@/lib/email/zoho";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.admin.permissions.includes("email.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { uid: uidStr } = await params;
  const uid = parseInt(uidStr, 10);
  if (isNaN(uid)) {
    return NextResponse.json({ error: "Invalid UID" }, { status: 400 });
  }

  try {
    await markAsRead(uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Failed to mark email as read" },
      { status: 500 }
    );
  }
}
