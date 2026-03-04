import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { DashboardCard } from "@/components/DashboardCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Studies",
  robots: { index: false },
};

const R2_BASE = "https://lib.thevibecodedcompany.com";

export default function MyStudiesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6">
        <BackButton href="/dashboard" label="Dashboard" />
        <PageHeader title="My Studies" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-4 sm:pb-6">
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 sm:gap-6">
          <DashboardCard
            title="Presentations"
            description="Upload and share files"
            href="/dashboard/me/presentations"
            image={`${R2_BASE}/images/presentations.webp`}
            index={0}
          />
          <DashboardCard
            title="Exam Scores"
            description="View your results"
            href="/dashboard/me/scores"
            image={`${R2_BASE}/images/exam-scores.webp`}
            index={1}
          />
        </div>
      </div>
    </div>
  );
}
