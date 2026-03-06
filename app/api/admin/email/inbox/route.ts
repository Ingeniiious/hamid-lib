import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { fetchInboxEmails } from "@/lib/email/zoho";

export async function GET(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.admin.permissions.includes("email.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10) || 1;
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "25", 10) || 25,
    50
  );
  const search = url.searchParams.get("search") || undefined;

  try {
    const result = await fetchInboxEmails(page, limit, search);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Email inbox fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
