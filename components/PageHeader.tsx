"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function PageHeader({
  title,
  subtitle,
  titleKey,
  subtitleKey,
}: {
  title?: ReactNode;
  subtitle?: string;
  /** i18n key — takes precedence over `title` when provided */
  titleKey?: string;
  /** i18n key — takes precedence over `subtitle` when provided */
  subtitleKey?: string;
}) {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedSubtitle = subtitleKey ? t(subtitleKey) : subtitle;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="pb-4 pt-2 text-center sm:pb-8 sm:pt-4"
    >
      <h1 className="font-display text-3xl font-light text-gray-900 sm:text-5xl dark:text-white">
        {resolvedTitle}
      </h1>
      {resolvedSubtitle && (
        <p className="mt-3 text-base text-gray-900/50 dark:text-white/50">
          {resolvedSubtitle}
        </p>
      )}
    </motion.div>
  );
}
