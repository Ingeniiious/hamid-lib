import { db } from "@/lib/db";
import { supportTicket, pushSubscription, adminUser } from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { sendPushNotification } from "@/lib/web-push";
import { sendEmail } from "@/lib/email";
import { buildSupportReplyEmail } from "./email-template";

export async function notifyUserOfReply(ticketId: string, isAdminReply: boolean) {
  try {
    const tickets = await db
      .select({ userId: supportTicket.userId, subject: supportTicket.subject })
      .from(supportTicket)
      .where(eq(supportTicket.id, ticketId))
      .limit(1);

    const ticket = tickets[0];
    if (!ticket) return;

    // Send push notification
    const subs = await db
      .select({ endpoint: pushSubscription.endpoint, p256dh: pushSubscription.p256dh, auth: pushSubscription.auth })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, ticket.userId));

    for (const sub of subs) {
      if (!sub.p256dh || !sub.auth) continue;
      await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: isAdminReply ? "Admin Reply" : "New Reply On Your Ticket",
          body: `Re: ${ticket.subject}`,
          url: `/dashboard/me/support/${ticketId}`,
          tag: `support-${ticketId}`,
          category: "support",
        }
      );
    }

    // Send email only for admin replies
    if (isAdminReply) {
      const userRows = await db.execute<{ name: string; email: string }>(
        sql`SELECT name, email FROM neon_auth.user WHERE id = ${ticket.userId} LIMIT 1`
      );
      const user = userRows[0];
      if (user?.email) {
        const lastMsg = await db.execute<{ message: string }>(
          sql`SELECT message FROM support_message WHERE ticket_id = ${ticketId} AND sender_type = 'admin' ORDER BY created_at DESC LIMIT 1`
        );
        const replyText = lastMsg[0]?.message || "";
        const ticketUrl = `https://libraryyy.com/dashboard/me/support/${ticketId}`;
        const emailData = buildSupportReplyEmail(user.name || "Student", ticket.subject, replyText, ticketUrl);
        await sendEmail({ to: user.email, ...emailData });
      }
    }
  } catch (error) {
    console.error("Failed to notify user of reply:", error);
  }
}

export async function notifyAdminsOfNewMessage(ticketId: string) {
  try {
    const tickets = await db
      .select({ subject: supportTicket.subject })
      .from(supportTicket)
      .where(eq(supportTicket.id, ticketId))
      .limit(1);

    const ticket = tickets[0];
    if (!ticket) return;

    const admins = await db
      .select({ userId: adminUser.userId })
      .from(adminUser);

    for (const admin of admins) {
      const subs = await db
        .select({ endpoint: pushSubscription.endpoint, p256dh: pushSubscription.p256dh, auth: pushSubscription.auth })
        .from(pushSubscription)
        .where(eq(pushSubscription.userId, admin.userId));

      for (const sub of subs) {
        if (!sub.p256dh || !sub.auth) continue;
        await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: "New Support Message",
            body: `Re: ${ticket.subject}`,
            url: `/admin/support/${ticketId}`,
            tag: `admin-support-${ticketId}`,
            category: "support",
          }
        );
      }
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
