import { auth } from "@/lib/auth";
import { DashboardCard } from "@/components/DashboardCard";
import { DashboardNotificationPrompt } from "@/components/DashboardNotificationPrompt";
import { Greeting } from "@/components/Greeting";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

const R2_BASE = "https://lib.thevibecodedcompany.com";

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
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 sm:max-w-4xl sm:grid-cols-3 sm:gap-6">
          <DashboardCard
            title="My Studies"
            description="Track your progress"
            href="/dashboard/me"
            image={`${R2_BASE}/images/my-studies.webp`}
            index={0}
          />
          <DashboardCard
            title="Courses"
            description="Browse all courses"
            href="/dashboard/courses"
            image={`${R2_BASE}/images/courses.webp`}
            imageClassName="max-h-full w-full object-contain scale-110"
            index={1}
          />
          <DashboardCard
            title="Contribute"
            description="Share course materials"
            href="/dashboard/contribute"
            image={`${R2_BASE}/images/courses.webp`}
            imageClassName="max-h-full w-full object-contain scale-110 opacity-70"
            index={2}
          />
        </div>
      </div>
    </div>
  );
}
