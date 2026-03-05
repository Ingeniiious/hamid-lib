import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscription } from "@/database/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, p256dh, auth: authKey } = body;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Upsert — update keys if endpoint already exists for this user
  await db
    .insert(pushSubscription)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh,
      auth: authKey,
    })
    .onConflictDoUpdate({
      target: [pushSubscription.userId, pushSubscription.endpoint],
      set: { p256dh, auth: authKey, createdAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.userId, session.user.id),
        eq(pushSubscription.endpoint, endpoint)
      )
    );

  return NextResponse.json({ ok: true });
}
