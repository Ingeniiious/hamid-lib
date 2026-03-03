"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function DashboardLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      {/* Skeleton top bar */}
      <div className="flex items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full bg-gray-900/10 dark:bg-white/10" />
          <Skeleton className="h-5 w-32 bg-gray-900/10 dark:bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full bg-gray-900/10 dark:bg-white/10" />
        </div>
      </div>

      {/* Skeleton major cards */}
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-4">
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="border-gray-900/10 bg-white/50 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            >
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4 bg-gray-900/10 dark:bg-white/10" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3 bg-gray-900/10 dark:bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
