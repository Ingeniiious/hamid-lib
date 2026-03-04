"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function CoursesLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mx-auto max-w-5xl px-6 pb-12"
    >
      {/* Back button skeleton */}
      <div className="pb-2 pt-4">
        <Skeleton className="mx-auto h-5 w-24 rounded-full bg-gray-900/10 dark:bg-white/10" />
      </div>

      {/* Page header skeleton */}
      <div className="pb-4 pt-6 text-center sm:pb-20 sm:pt-10">
        <Skeleton className="mx-auto h-8 w-40 rounded-lg bg-gray-900/10 sm:h-10 dark:bg-white/10" />
        <Skeleton className="mx-auto mt-3 h-4 w-32 rounded-lg bg-gray-900/10 dark:bg-white/10" />
      </div>

      {/* Major cards grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
          >
            <Skeleton className="mx-auto h-5 w-2/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
            <Skeleton className="mx-auto mt-2 h-4 w-1/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
