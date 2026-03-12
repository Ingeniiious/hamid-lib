"use client";

import { useTranslation } from "@/lib/i18n";

export function MyContributionsStrings({
  variant,
  page,
  totalPages,
}: {
  variant: "empty" | "pagination";
  page?: number;
  totalPages?: number;
}) {
  const { t } = useTranslation();

  if (variant === "empty") {
    return (
      <div className="flex flex-col items-center justify-center pt-32 text-center">
        <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
          {t("contribute.noContributions")}
        </h2>
        <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
          {t("contribute.contributionsWillAppear")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      {page! > 1 && (
        <a
          href={`/dashboard/contribute/my?page=${page! - 1}`}
          className="rounded-lg border border-gray-900/10 px-3 py-1.5 text-sm text-gray-900/60 hover:bg-gray-900/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
        >
          {t("contribute.previous")}
        </a>
      )}
      <span className="text-sm text-gray-900/40 dark:text-white/40">
        {t("contribute.pageOf")
          .replace("{page}", String(page))
          .replace("{total}", String(totalPages))}
      </span>
      {page! < totalPages! && (
        <a
          href={`/dashboard/contribute/my?page=${page! + 1}`}
          className="rounded-lg border border-gray-900/10 px-3 py-1.5 text-sm text-gray-900/60 hover:bg-gray-900/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
        >
          {t("contribute.next")}
        </a>
      )}
    </div>
  );
}
