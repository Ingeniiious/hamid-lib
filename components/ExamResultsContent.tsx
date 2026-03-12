"use client";

import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

export function ExamResultsContent() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={t("exam.title")}
          subtitle={t("exam.subtitle")}
        />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          {/* Placeholder — will be replaced with actual exam results list */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-light text-gray-900/50 dark:text-white/50">
              {t("exam.noResults")}
            </p>
            <p className="mt-2 text-sm text-gray-900/30 dark:text-white/30">
              {t("exam.noResultsDescription")}
            </p>
          </div>
        </div>
      </div>
      <BackButton href="/dashboard/me" label={t("exam.myStudies")} floating />
    </div>
  );
}
