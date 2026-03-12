"use client";

import { DashboardCard } from "@/components/DashboardCard";
import { useTranslation } from "@/lib/i18n";

const R2_BASE = "https://lib.thevibecodedcompany.com";

export function DashboardCardGrid() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 lg:max-w-5xl lg:grid-cols-3">
      <DashboardCard
        title={t("dashboard.myStudies")}
        description={t("dashboard.trackProgress")}
        href="/dashboard/me"
        image={`${R2_BASE}/images/my-studies.webp`}
        index={0}
      />
      <DashboardCard
        title={t("dashboard.mySpace")}
        description={t("dashboard.notesAndMore")}
        href="/dashboard/space"
        image={`${R2_BASE}/images/my-space.webp`}
        imageClassName="max-h-full w-full object-contain scale-110"
        index={1}
      />
      <DashboardCard
        title={t("dashboard.courses")}
        description={t("dashboard.browseAllCourses")}
        href="/dashboard/courses"
        image={`${R2_BASE}/images/courses.webp`}
        imageClassName="max-h-full w-full object-contain scale-110"
        index={2}
      />
    </div>
  );
}
