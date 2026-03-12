import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfile } from "@/database/schema";
import { getAvatarUrl } from "@/lib/avatar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { DashboardShell } from "@/components/DashboardShell";
import { LanguageSync } from "@/components/LanguageSync";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await auth.getSession();
  if (!session) redirect("/auth");

  // Extend 7-day Neon Auth sessions to 30 days for PWA persistence.
  // Non-blocking — runs in the background, doesn't delay page render.
  const sessionExpiry = new Date(session.session.expiresAt).getTime();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (sessionExpiry - Date.now() < 25 * 24 * 60 * 60 * 1000) {
    const newExpiry = new Date(Date.now() + THIRTY_DAYS_MS);
    db.execute(
      sql`UPDATE neon_auth.session SET "expiresAt" = ${newExpiry} WHERE id = ${session.session.id}::uuid`
    ).catch(() => {});
  }

  const userName = session.user?.name || "Student";

  // Fetch profile for avatar
  const profiles = await db
    .select({
      avatarUrl: userProfile.avatarUrl,
      gender: userProfile.gender,
      contributorVerifiedAt: userProfile.contributorVerifiedAt,
      language: userProfile.language,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);
  const profile = profiles[0];
  const avatarUrl = getAvatarUrl(profile?.avatarUrl, profile?.gender);
  const isContributor = !!profile?.contributorVerifiedAt;
  const userLanguage = profile?.language || "en";

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      {/* Sync DB language to i18n context (cross-device persistence) */}
      <LanguageSync language={userLanguage} />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Persistent top bar — stays across all dashboard routes */}
        <div className="shrink-0">
          <DashboardTopBar userName={userName} avatarUrl={avatarUrl} isContributor={isContributor} />
        </div>

        {/* Page content — cross-fades between dashboard routes */}
        <div className="min-h-0 flex-1">
          <DashboardShell>{children}</DashboardShell>
        </div>
      </div>
    </div>
  );
}
