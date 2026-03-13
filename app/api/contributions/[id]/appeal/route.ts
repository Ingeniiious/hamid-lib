import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contribution, contributionAppeal } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST — create an appeal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const contributionId = parseInt(id, 10);
  if (isNaN(contributionId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Verify ownership and rejection status
  const [contrib] = await db
    .select({
      id: contribution.id,
      userId: contribution.userId,
      status: contribution.status,
    })
    .from(contribution)
    .where(eq(contribution.id, contributionId))
    .limit(1);

  if (!contrib) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (contrib.userId !== session.user.id) {
    return NextResponse.json({ error: "Not your contribution" }, { status: 403 });
  }

  if (contrib.status !== "rejected") {
    return NextResponse.json(
      { error: "Only rejected contributions can be appealed" },
      { status: 400 }
    );
  }

  // Check for existing active appeal
  const [existingAppeal] = await db
    .select({ id: contributionAppeal.id, status: contributionAppeal.status })
    .from(contributionAppeal)
    .where(
      and(
        eq(contributionAppeal.contributionId, contributionId),
        eq(contributionAppeal.userId, session.user.id)
      )
    )
    .limit(1);

  if (
    existingAppeal &&
    !["upheld", "overturned"].includes(existingAppeal.status)
  ) {
    return NextResponse.json(
      { error: "An active appeal already exists for this contribution" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const appealText = (body.appealText as string)?.trim();

  if (!appealText || appealText.length < 10) {
    return NextResponse.json(
      { error: "Appeal text must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (appealText.length > 2000) {
    return NextResponse.json(
      { error: "Appeal text too long (max 2000 characters)" },
      { status: 400 }
    );
  }

  const [appeal] = await db
    .insert(contributionAppeal)
    .values({
      contributionId,
      userId: session.user.id,
      appealText,
      status: "vouching",
    })
    .returning();

  return NextResponse.json({ appeal }, { status: 201 });
}

// GET — get appeal status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const contributionId = parseInt(id, 10);
  if (isNaN(contributionId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [appeal] = await db
    .select()
    .from(contributionAppeal)
    .where(eq(contributionAppeal.contributionId, contributionId))
    .limit(1);

  if (!appeal) {
    return NextResponse.json({ appeal: null });
  }

  return NextResponse.json({ appeal });
}
