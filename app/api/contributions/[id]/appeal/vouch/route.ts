import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  contributionAppeal,
  appealVouch,
  contribution,
  userProfile,
} from "@/database/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST — vouch for an appeal
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

  // Find the active appeal
  const [appeal] = await db
    .select()
    .from(contributionAppeal)
    .where(eq(contributionAppeal.contributionId, contributionId))
    .limit(1);

  if (!appeal) {
    return NextResponse.json({ error: "No appeal found" }, { status: 404 });
  }

  if (appeal.status !== "vouching") {
    return NextResponse.json(
      { error: "This appeal is not accepting vouches" },
      { status: 400 }
    );
  }

  // Must be a verified contributor to vouch
  const [profile] = await db
    .select({ contributorVerifiedAt: userProfile.contributorVerifiedAt })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  if (!profile?.contributorVerifiedAt) {
    return NextResponse.json(
      { error: "You must verify your university email before vouching" },
      { status: 403 }
    );
  }

  // Can't vouch for your own appeal
  if (appeal.userId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot vouch for your own appeal" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const comment = (body.comment as string)?.trim() || null;

  // Insert vouch (unique constraint prevents double-vouching)
  try {
    await db.insert(appealVouch).values({
      appealId: appeal.id,
      userId: session.user.id,
      comment,
    });
  } catch (e: any) {
    if (e.code === "23505") {
      return NextResponse.json(
        { error: "You have already vouched for this appeal" },
        { status: 409 }
      );
    }
    throw e;
  }

  // Increment vouch count
  const [updated] = await db
    .update(contributionAppeal)
    .set({
      currentVouches: sql`${contributionAppeal.currentVouches} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(contributionAppeal.id, appeal.id))
    .returning({
      currentVouches: contributionAppeal.currentVouches,
      requiredVouches: contributionAppeal.requiredVouches,
    });

  // At 5 vouches → notify admin for manual review
  if (updated.currentVouches === 5) {
    try {
      const { dispatchNotification } = await import(
        "@/lib/notification-dispatch"
      );
      // Notify admin (Hamid) about the appeal gaining traction
      await dispatchNotification("system", {
        category: "system",
        title: "Appeal Needs Manual Review",
        body: `Appeal for contribution #${contributionId} has reached 5 vouches. Consider reviewing it manually.`,
        url: `/admin/contributions`,
        metadata: { contributionId, appealId: appeal.id, vouches: 5 },
      });
    } catch (err) {
      console.error("[appeal-vouch] Failed to notify admin at 5 vouches:", err);
    }
  }

  // At 10 vouches → trigger automatic re-evaluation
  if (updated.currentVouches >= updated.requiredVouches) {
    await db
      .update(contributionAppeal)
      .set({ status: "re_evaluating", updatedAt: new Date() })
      .where(eq(contributionAppeal.id, appeal.id));

    // Update contribution status
    await db
      .update(contribution)
      .set({ status: "re_evaluating", updatedAt: new Date() })
      .where(eq(contribution.id, contributionId));

    // Re-create pipeline job
    try {
      const { createJob } = await import("@/lib/ai/orchestrator");
      const [contrib] = await db
        .select({
          courseId: contribution.courseId,
          textContent: contribution.textContent,
          title: contribution.title,
        })
        .from(contribution)
        .where(eq(contribution.id, contributionId))
        .limit(1);

      if (contrib?.courseId && contrib.textContent) {
        const { detectLanguageFromText } = await import("@/lib/ai/translation");
        const sourceContent = `# Source: ${contrib.title}\n\n## Text Content\n\n### Page 1\n\n${contrib.textContent}`;
        const lang = detectLanguageFromText(sourceContent);

        const jobId = await createJob({
          courseId: contrib.courseId,
          contributionIds: [contributionId],
          outputTypes: ["study_guide", "flashcards", "quiz"],
          startedBy: "system",
          sourceContent,
          sourceLanguage: lang,
        });

        await db
          .update(contributionAppeal)
          .set({ reEvaluationJobId: jobId, updatedAt: new Date() })
          .where(eq(contributionAppeal.id, appeal.id));
      }

      // Notify the appeal creator
      const { dispatchNotification } = await import(
        "@/lib/notification-dispatch"
      );
      await dispatchNotification(appeal.userId, {
        category: "contribution",
        title: "Appeal Re-Evaluation Started",
        body: "Your appeal has received enough vouches and is being re-evaluated.",
        url: "/dashboard/contribute/my",
        metadata: { contributionId, appealId: appeal.id },
      });
    } catch (err) {
      console.error("[appeal-vouch] Failed to trigger re-evaluation:", err);
    }
  }

  return NextResponse.json({
    currentVouches: updated.currentVouches,
    requiredVouches: updated.requiredVouches,
    reEvaluating: updated.currentVouches >= updated.requiredVouches,
  });
}
