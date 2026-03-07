import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { DashboardCard } from "@/components/DashboardCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Studies",
  description: "Track your study progress, exam scores, and course history.",
};

const R2_BASE = "https://lib.thevibecodedcompany.com";

export default function MyStudiesPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title="My Studies" />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 sm:flex sm:items-center sm:justify-center"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 pt-8 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 sm:pt-0 lg:max-w-5xl lg:grid-cols-3">
          <DashboardCard
            title="Presentations"
            description="Upload and share files"
            href="/dashboard/me/presentations"
            image={`${R2_BASE}/images/present.webp`}
            index={0}
          />
          <DashboardCard
            title="Exam Results"
            description="View your results"
            href="/dashboard/me/exam"
            image={`${R2_BASE}/images/exam-results.webp`}
            index={1}
          />
          <DashboardCard
            title="Calendar"
            description="Schedules and deadlines"
            href="/dashboard/me/calendar"
            image={`${R2_BASE}/images/calendar.webp`}
            index={2}
          />
        </div>
      </div>
      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
