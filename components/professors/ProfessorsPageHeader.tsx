"use client";

import { useTranslation } from "@/lib/i18n";

export function ProfessorsPageHeader() {
  const { locale, t } = useTranslation();
  const titleDir = locale === "fa" ? "rtl" : undefined;

  return (
    <div className="mb-10 text-center">
      <h1
        dir={titleDir}
        className="font-display text-3xl font-light tracking-tight text-gray-900 dark:text-white sm:text-4xl"
      >
        {t("professors.title")}
      </h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {t("professors.subtitle")}
      </p>
    </div>
  );
}
