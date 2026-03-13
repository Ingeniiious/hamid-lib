"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleBookmark } from "@/lib/bookmarks";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

type Bookmark = {
  id: number;
  contentId: string;
  note: string | null;
  savedAt: Date;
  contentTitle: string;
  contentType: string;
  courseId: string;
  courseTitle: string | null;
};

export default function SavedItemsClient({
  bookmarks,
  total,
  page,
  limit,
}: {
  bookmarks: Bookmark[];
  total: number;
  page: number;
  limit: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-4xl mx-auto px-4 py-8"
    >
      <h1 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
        {t("bookmarks.savedItems")}
      </h1>

      {bookmarks.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="text-center text-gray-500 dark:text-gray-400 py-16"
        >
          {t("bookmarks.empty")}
        </motion.p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm, i) => (
            <SavedCard key={bm.id} bookmark={bm} index={i} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => router.push(`/dashboard/me/saved?page=${page - 1}`)}
            disabled={page <= 1}
            className="rounded-full px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {t("bookmarks.previous")}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => router.push(`/dashboard/me/saved?page=${page + 1}`)}
            disabled={page >= totalPages}
            className="rounded-full px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {t("bookmarks.next")}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SavedCard({
  bookmark,
  index,
}: {
  bookmark: Bookmark;
  index: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      await toggleBookmark(bookmark.contentId);
      router.refresh();
    });
  };

  const typeBadgeColor: Record<string, string> = {
    study_guide: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    flashcards: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    quiz: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    mock_exam: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    podcast_script: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: EASE }}
      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-center"
    >
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-medium mb-3 ${
          typeBadgeColor[bookmark.contentType] ??
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {bookmark.contentType.replace(/_/g, " ")}
      </span>

      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
        {bookmark.contentTitle}
      </h3>

      {bookmark.courseTitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {bookmark.courseTitle}
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {new Date(bookmark.savedAt).toLocaleDateString()}
      </p>

      <button
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-full px-4 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50"
      >
        {t("bookmarks.remove")}
      </button>
    </motion.div>
  );
}
