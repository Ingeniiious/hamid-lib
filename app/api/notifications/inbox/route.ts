import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inAppNotification } from "@/database/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET — paginated notifications + unread count
export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const [unreadCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inAppNotification)
    .where(
      and(
        eq(inAppNotification.userId, session.user.id),
        eq(inAppNotification.isRead, false)
      )
    );

  const notifications = await db
    .select()
    .from(inAppNotification)
    .where(eq(inAppNotification.userId, session.user.id))
    .orderBy(desc(inAppNotification.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    notifications,
    unreadCount: unreadCount.count,
  });
}

// PATCH — mark notification(s) as read
export async function PATCH(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.markAllRead) {
    await db
      .update(inAppNotification)
      .set({ isRead: true })
      .where(
        and(
          eq(inAppNotification.userId, session.user.id),
          eq(inAppNotification.isRead, false)
        )
      );
    return NextResponse.json({ success: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await db
      .update(inAppNotification)
      .set({ isRead: true })
      .where(
        and(
          eq(inAppNotification.userId, session.user.id),
          inArray(inAppNotification.id, body.ids)
        )
      );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide ids or markAllRead" }, { status: 400 });
}
