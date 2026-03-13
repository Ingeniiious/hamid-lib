"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { supportTicket, supportMessage } from "@/database/schema";
import { eq, desc, and, sql, ne } from "drizzle-orm";
import { generateAiReply } from "@/lib/support/ai-reply";
import { notifyUserOfReply, notifyAdminsOfNewMessage } from "@/lib/support/notifications";

async function getSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  return session;
}

export async function listMyTickets(page = 1, limit = 10) {
  const session = await getSession();

  const offset = (page - 1) * limit;

  const countResult = await db.execute<{ count: string }>(
    sql`SELECT count(*) FROM support_ticket WHERE user_id = ${session.user.id}`
  );
  const total = parseInt(countResult[0]?.count ?? "0");

  const tickets = await db
    .select({
      id: supportTicket.id,
      subject: supportTicket.subject,
      category: supportTicket.category,
      priority: supportTicket.priority,
      status: supportTicket.status,
      messageCount: supportTicket.messageCount,
      lastMessageAt: supportTicket.lastMessageAt,
      createdAt: supportTicket.createdAt,
    })
    .from(supportTicket)
    .where(eq(supportTicket.userId, session.user.id))
    .orderBy(desc(supportTicket.lastMessageAt))
    .limit(limit)
    .offset(offset);

  return {
    tickets: tickets.map((t) => ({
      ...t,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

export async function createTicket(
  subject: string,
  message: string,
  category: string,
  priority: string
) {
  const session = await getSession();

  const [ticket] = await db
    .insert(supportTicket)
    .values({
      userId: session.user.id,
      subject,
      category,
      priority,
      status: "open",
      messageCount: 1,
    })
    .returning({ id: supportTicket.id });

  await db.insert(supportMessage).values({
    ticketId: ticket.id,
    senderType: "user",
    senderId: session.user.id,
    message,
    isAiGenerated: false,
  });

  // Generate AI reply
  const aiReply = await generateAiReply(subject, message, category);

  await db.insert(supportMessage).values({
    ticketId: ticket.id,
    senderType: "ai",
    senderId: null,
    message: aiReply,
    isAiGenerated: true,
  });

  await db
    .update(supportTicket)
    .set({
      messageCount: 2,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(supportTicket.id, ticket.id));

  // Push notification only (no email for AI reply)
  notifyUserOfReply(ticket.id, false).catch(() => {});

  return ticket.id;
}

export async function getTicketDetail(ticketId: string) {
  const session = await getSession();

  const tickets = await db
    .select()
    .from(supportTicket)
    .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.userId, session.user.id)))
    .limit(1);

  const ticket = tickets[0];
  if (!ticket) redirect("/dashboard/me/support");

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

  // Mark unread admin/ai messages as read
  await db
    .update(supportMessage)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(supportMessage.ticketId, ticketId),
        ne(supportMessage.senderType, "user"),
        sql`${supportMessage.readAt} IS NULL`
      )
    );

  return {
    ticket: {
      ...ticket,
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function addUserMessage(ticketId: string, message: string) {
  const session = await getSession();

  // Verify ticket belongs to user
  const tickets = await db
    .select({ id: supportTicket.id, status: supportTicket.status })
    .from(supportTicket)
    .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.userId, session.user.id)))
    .limit(1);

  if (!tickets[0]) throw new Error("Ticket not found");

  await db.insert(supportMessage).values({
    ticketId,
    senderType: "user",
    senderId: session.user.id,
    message,
    isAiGenerated: false,
  });

  const newStatus = tickets[0].status === "awaiting_reply" ? "open" : tickets[0].status;

  await db
    .update(supportTicket)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`${supportTicket.messageCount} + 1`,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(supportTicket.id, ticketId));

  notifyAdminsOfNewMessage(ticketId).catch(() => {});
}
