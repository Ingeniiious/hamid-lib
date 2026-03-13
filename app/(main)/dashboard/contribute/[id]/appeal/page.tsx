import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contribution, contributionAppeal } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppealFormClient from "./AppealFormClient";

export default async function AppealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const { id } = await params;
  const contributionId = parseInt(id, 10);
  if (isNaN(contributionId)) redirect("/dashboard/contribute/my");

  // Fetch contribution
  const [contrib] = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      status: contribution.status,
      userId: contribution.userId,
      rejectionSource: contribution.rejectionSource,
      rejectionReason: contribution.rejectionReason,
      reviewNote: contribution.reviewNote,
    })
    .from(contribution)
    .where(eq(contribution.id, contributionId))
    .limit(1);

  if (!contrib || contrib.userId !== session.user.id) {
    redirect("/dashboard/contribute/my");
  }

  // Fetch existing appeal if any
  const [existingAppeal] = await db
    .select()
    .from(contributionAppeal)
    .where(eq(contributionAppeal.contributionId, contributionId))
    .limit(1);

  return (
    <AppealFormClient
      contribution={contrib}
      existingAppeal={existingAppeal ?? null}
    />
  );
}
