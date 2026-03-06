import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const { timezone } = await request.json();

    // Validate IANA timezone
    if (!timezone || typeof timezone !== "string") {
      return new NextResponse(null, { status: 400 });
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    await db
      .update(userProfile)
      .set({ timezone })
      .where(eq(userProfile.userId, session.user.id));

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
