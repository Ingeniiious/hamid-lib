"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Review = {
  id: number;
  overallRating: number;
  difficultyRating: number;
  wouldTakeAgain: boolean;
  reviewText: string | null;
  tags: string[] | null;
  courseName: string | null;
  createdAt: string;
};

function ratingBg(rating: number) {
  if (rating >= 4) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (rating >= 3) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  if (rating >= 2) return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

export function ReviewCard({ review }: { review: Review }) {
  const { t } = useTranslation();
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-xl border bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${ratingBg(review.overallRating)}`}>
            {review.overallRating}/5
          </span>
          {review.courseName && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {review.courseName}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{t("professors.difficultyLabel")} {review.difficultyRating}/5</span>
        <span>{review.wouldTakeAgain ? t("professors.wouldTakeAgainYes") : t("professors.wouldTakeAgainNo")}</span>
      </div>

      {review.reviewText && (
        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {review.reviewText}
        </p>
      )}

      {review.tags && review.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
