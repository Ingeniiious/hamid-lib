"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusStyles = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  under_review:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
} as const;

const statusKeys: Record<string, string> = {
  pending: "contribute.statusPending",
  approved: "contribute.statusApproved",
  rejected: "contribute.statusRejected",
  under_review: "contribute.statusUnderReview",
};

interface ContributionCardProps {
  contribution: {
    id: number;
    title: string;
    description: string | null;
    type: string;
    fileName: string | null;
    status: string;
    reviewNote: string | null;
    createdAt: Date;
    courseTitle: string | null;
  };
  index: number;
}

export function ContributionCard({
  contribution: c,
  index,
}: ContributionCardProps) {
  const { t, locale } = useTranslation();
  const style =
    statusStyles[c.status as keyof typeof statusStyles] || statusStyles.pending;
  const statusLabel = t(statusKeys[c.status] || "contribute.statusPending");

  const dateLocale = locale === "fa" ? "fa-IR" : locale === "tr" ? "tr-TR" : "en-US";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease, delay: index * 0.05 }}
      className="rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {c.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-900/40 dark:text-white/40">
            <span className="capitalize">{c.type}</span>
            {c.fileName && (
              <>
                <span>&middot;</span>
                <span className="truncate">{c.fileName}</span>
              </>
            )}
            {c.courseTitle && (
              <>
                <span>&middot;</span>
                <span className="truncate">{c.courseTitle}</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="secondary" className={style}>
          {statusLabel}
        </Badge>
      </div>

      {c.description && (
        <p className="mt-2 text-xs text-gray-900/50 dark:text-white/50">
          {c.description}
        </p>
      )}

      {c.reviewNote && c.status === "rejected" && (
        <div className="mt-2 rounded-lg bg-red-50/50 p-2 dark:bg-red-950/10">
          <p className="text-xs text-red-600 dark:text-red-400">
            {c.reviewNote}
          </p>
        </div>
      )}

      <p className="mt-2 text-[11px] text-gray-900/30 dark:text-white/30">
        {new Date(c.createdAt).toLocaleDateString(dateLocale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </motion.div>
  );
}
