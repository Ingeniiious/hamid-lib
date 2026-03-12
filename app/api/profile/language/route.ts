import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { language } = await request.json();
  if (!language || !["en", "fa", "tr"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await db
    .update(userProfile)
    .set({ language })
    .where(eq(userProfile.userId, session.user.id));

  return NextResponse.json({ ok: true });
}
