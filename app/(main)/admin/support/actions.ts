"use server";

import { getAdminSession, requirePermission } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { supportTicket, supportMessage } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { logAdminAction } from "@/lib/admin/audit";
import { notifyUserOfReply } from "@/lib/support/notifications";

export async function getSupportOverview() {
  const session = await getAdminSession();
  await requirePermission(session, "support.view");

  const rows = await db.execute<{
    total: string;
    open: string;
    awaiting: string;
    resolved: string;
  }>(sql`
    SELECT
      count(*) as total,
      count(*) FILTER (WHERE status = 'open') as open,
      count(*) FILTER (WHERE status = 'awaiting_reply') as awaiting,
      count(*) FILTER (WHERE status = 'resolved') as resolved
    FROM support_ticket
  `);

  const r = rows[0];
  return {
    total: parseInt(r?.total ?? "0"),
    open: parseInt(r?.open ?? "0"),
    awaiting: parseInt(r?.awaiting ?? "0"),
    resolved: parseInt(r?.resolved ?? "0"),
  };
}

export async function listAllTickets(
  status?: string,
  page = 1,
  limit = 25,
  search?: string
) {
  const session = await getAdminSession();
  await requirePermission(session, "support.view");

  const offset = (page - 1) * limit;

  // Build WHERE clause dynamically for SQL-level filtering
  const statusFilter = status && status !== "all" ? status : null;
  const searchTerm = search?.trim() || null;

  const whereParts = [];
  if (statusFilter) whereParts.push(sql`st.status = ${statusFilter}`);
  if (searchTerm) whereParts.push(sql`st.subject ILIKE ${"%" + searchTerm + "%"}`);
  const whereClause = whereParts.length > 0
    ? sql`WHERE ${sql.join(whereParts, sql` AND `)}`
    : sql``;

  // Count query (SQL-level filtering)
  const countResult = await db.execute<{ count: string }>(
    sql`SELECT count(*) FROM support_ticket st ${whereClause}`
  );
  const total = parseInt(countResult[0]?.count ?? "0");

  // Data query with SQL-level filtering, pagination, and JOIN
  const ticketsResult = await db.execute(sql`
    SELECT st.id, st.user_id, st.subject, st.category, st.priority, st.status,
           st.message_count, st.last_message_at, st.created_at,
           u.name as user_name, u.email as user_email
    FROM support_ticket st
    LEFT JOIN neon_auth."user" u ON u.id = st.user_id::uuid
    ${whereClause}
    ORDER BY st.last_message_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    tickets: (ticketsResult as any[]).map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      messageCount: t.message_count,
      lastMessageAt: t.last_message_at ? new Date(t.last_message_at).toISOString() : null,
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : null,
      userName: t.user_name || "Unknown",
      userEmail: t.user_email || "",
    })),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

export async function getAdminTicketDetail(ticketId: string) {
  const session = await getAdminSession();
  await requirePermission(session, "support.view");

  const ticketResult = await db.execute(sql`
    SELECT
      st.*,
      u.name as user_name,
      u.email as user_email
    FROM support_ticket st
    LEFT JOIN neon_auth."user" u ON u.id = st.user_id::uuid
    WHERE st.id = ${ticketId}
    LIMIT 1
  `);

  const ticket = (ticketResult as any[])[0];
  if (!ticket) return null;

  const messages = await db
    .select({
      id: supportMessage.id,
      senderType: supportMessage.senderType,
      senderId: supportMessage.senderId,
      message: supportMessage.message,
      isAiGenerated: supportMessage.isAiGenerated,
      createdAt: supportMessage.createdAt,
    })
    .from(supportMessage)
    .where(eq(supportMessage.ticketId, ticketId))
    .orderBy(supportMessage.createdAt);

  return {
    ticket: {
      id: ticket.id,
      userId: ticket.user_id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      messageCount: ticket.message_count,
      lastMessageAt: ticket.last_message_at ? new Date(ticket.last_message_at).toISOString() : null,
      createdAt: ticket.created_at ? new Date(ticket.created_at).toISOString() : null,
      userName: ticket.user_name || "Unknown",
      userEmail: ticket.user_email || "",
    },
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function addAdminReply(ticketId: string, message: string) {
  const session = await getAdminSession();
  await requirePermission(session, "support.reply");

  await db.insert(supportMessage).values({
    ticketId,
    senderType: "admin",
    senderId: session.user.id,
    message,
    isAiGenerated: false,
  });

  await db
    .update(supportTicket)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`${supportTicket.messageCount} + 1`,
      status: "awaiting_reply",
      updatedAt: new Date(),
    })
    .where(eq(supportTicket.id, ticketId));

  // Push + email notification
  notifyUserOfReply(ticketId, true).catch(() => {});

  await logAdminAction({
    adminUserId: session.user.id,
    action: "support.reply",
    entityType: "support_ticket",
    entityId: ticketId,
  });
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const session = await getAdminSession();
  await requirePermission(session, "support.reply");

  await db
    .update(supportTicket)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTicket.id, ticketId));

  await logAdminAction({
    adminUserId: session.user.id,
    action: "support.status_change",
    entityType: "support_ticket",
    entityId: ticketId,
    details: { status },
  });

  // Notify user if resolved/closed
  if (status === "resolved" || status === "closed") {
    notifyUserOfReply(ticketId, false).catch(() => {});
  }
}
