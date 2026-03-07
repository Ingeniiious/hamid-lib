import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfile } from "@/database/schema";
import { getAvatarUrl } from "@/lib/avatar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { DashboardShell } from "@/components/DashboardShell";
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

  const userName = session.user?.name || "Student";

  // Fetch profile for avatar
  const profiles = await db
    .select({ avatarUrl: userProfile.avatarUrl, gender: userProfile.gender })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);
  const profile = profiles[0];
  const avatarUrl = getAvatarUrl(profile?.avatarUrl, profile?.gender);

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Persistent top bar — stays across all dashboard routes */}
        <div className="shrink-0">
          <DashboardTopBar userName={userName} avatarUrl={avatarUrl} />
        </div>

        {/* Page content — cross-fades between dashboard routes */}
        <div className="min-h-0 flex-1">
          <DashboardShell>{children}</DashboardShell>
        </div>
      </div>
    </div>
  );
}
