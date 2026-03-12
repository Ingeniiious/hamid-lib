"use client";

import { DashboardCard } from "@/components/DashboardCard";
import { useTranslation } from "@/lib/i18n";

const R2_BASE = "https://lib.thevibecodedcompany.com";

export function StudiesCardGrid() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 pt-8 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 sm:pt-0 lg:max-w-5xl lg:grid-cols-3">
      <DashboardCard
        title={t("studies.presentations")}
        description={t("studies.uploadAndShare")}
        href="/dashboard/me/presentations"
        image={`${R2_BASE}/images/present.webp`}
        index={0}
      />
      <DashboardCard
        title={t("studies.examResults")}
        description={t("studies.viewResults")}
        href="/dashboard/me/exam"
        image={`${R2_BASE}/images/exam-results.webp`}
        index={1}
      />
      <DashboardCard
        title={t("studies.calendar")}
        description={t("studies.schedulesAndDeadlines")}
        href="/dashboard/me/calendar"
        image={`${R2_BASE}/images/calendar.webp`}
        index={2}
      />
    </div>
  );
}
