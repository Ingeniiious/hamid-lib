"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function DashboardLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="flex h-full items-center justify-center px-6 pb-12">
        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-[3rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-full flex-col items-center justify-center p-6 sm:p-8">
                <Skeleton className="h-44 w-44 rounded-xl bg-gray-900/10 sm:h-52 sm:w-52 lg:h-60 lg:w-60 dark:bg-white/10" />
                <Skeleton className="mx-auto mt-5 h-7 w-2/3 bg-gray-900/10 dark:bg-white/10" />
                <Skeleton className="mx-auto mt-2 h-4 w-1/2 bg-gray-900/10 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
