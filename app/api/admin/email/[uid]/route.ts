import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { fetchEmailById, deleteEmail } from "@/lib/email/zoho";

export async function GET(
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
    const email = await fetchEmailById(uid);
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }
    return NextResponse.json(email);
  } catch (error) {
    console.error("Email fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.admin.permissions.includes("email.delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { uid: uidStr } = await params;
  const uid = parseInt(uidStr, 10);
  if (isNaN(uid)) {
    return NextResponse.json({ error: "Invalid UID" }, { status: 400 });
  }

  try {
    await deleteEmail(uid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
