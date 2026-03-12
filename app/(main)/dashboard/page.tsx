import { auth } from "@/lib/auth";
import { DashboardCardGrid } from "@/components/DashboardCardGrid";
import { DashboardNotificationPrompt } from "@/components/DashboardNotificationPrompt";
import { Greeting } from "@/components/Greeting";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your personal study dashboard on Libraryyy.",
};

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  const firstName = (session?.user?.name || "Student").split(" ")[0];

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title={<Greeting name={firstName} />} />
      </div>

      {/* Scrollable content */}
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 pb-8 sm:pb-6"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <DashboardNotificationPrompt />
        <DashboardCardGrid />
      </div>
    </div>
  );
}
