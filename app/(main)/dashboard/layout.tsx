import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { DashboardShell } from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await auth.getSession();
  if (!session) redirect("/auth");

  const userName = session.user?.name || "Student";

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Persistent top bar — stays across all dashboard routes */}
        <div className="shrink-0">
          <DashboardTopBar userName={userName} />
        </div>

        {/* Page content — cross-fades between dashboard routes */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardShell>{children}</DashboardShell>
        </div>
      </div>
    </div>
  );
}
