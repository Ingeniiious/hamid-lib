import { auth } from "@/lib/auth";
import { BackButton } from "@/components/BackButton";
import { DashboardCard } from "@/components/DashboardCard";
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
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <BackButton href="/dashboard" label="" invisible />
        <PageHeader title={`Hey, ${firstName}`} />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-4 sm:pb-6">
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 sm:gap-6">
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
            index={1}
          />
        </div>
      </div>
    </div>
  );
}
