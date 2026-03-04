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
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <BackButton href="/dashboard" label="Dashboard" />
        <PageHeader title="My Studies" />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:flex sm:items-center sm:justify-center sm:pb-6"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 pt-8 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 sm:pt-0">
          <DashboardCard
            title="Presentations"
            description="Upload and share files"
            href="/dashboard/me/presentations"
            image={`${R2_BASE}/images/presentation.webp`}
            index={0}
          />
          <DashboardCard
            title="Exam Results"
            description="View your results"
            href="/dashboard/me/exam"
            image={`${R2_BASE}/images/exam.webp`}
            index={1}
          />
        </div>
      </div>
    </div>
  );
}
