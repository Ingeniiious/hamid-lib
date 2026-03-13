import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { supportTicket } from "@/database/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
  }

  // Check auth: user session OR admin session
  const { data: session } = await auth.getSession();
  const adminSession = await getAdminSessionForAPI();

  if (!session?.user && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session?.user?.id;

  // Fetch ticket
  const tickets = await db
    .select({
      id: supportTicket.id,
      userId: supportTicket.userId,
      updatedAt: supportTicket.updatedAt,
      messageCount: supportTicket.messageCount,
    })
    .from(supportTicket)
    .where(eq(supportTicket.id, ticketId))
    .limit(1);

  const ticket = tickets[0];
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If user (not admin), verify ticket belongs to them
  if (!adminSession && userId && ticket.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(parseInt(since)) : new Date(0);

  const changed = ticket.updatedAt > sinceDate;

  return NextResponse.json({
    changed,
    updatedAt: ticket.updatedAt.toISOString(),
    messageCount: ticket.messageCount,
  });
}
