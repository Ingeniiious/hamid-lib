"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { AreaChartCard } from "@/components/admin/charts/AreaChartCard";
import { getTopPages, getPageViewsOverTime } from "../actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function getLast30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function AnalyticsPagesPage() {
  const { from, to } = getLast30Days();
  const [pages, setPages] = useState<{ path: string; count: number }[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pathViews, setPathViews] = useState<{ date: string; count: number }[]>(
    []
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getTopPages(from, to, 20);
      setPages(data);
      if (data.length > 0) {
        setSelectedPath(data[0].path);
      }
    });
  }, [from, to]);

  useEffect(() => {
    if (!selectedPath) return;
    startTransition(async () => {
      const data = await getPageViewsOverTime(from, to, "day");
      setPathViews(data);
    });
  }, [selectedPath, from, to]);

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-2xl font-light text-gray-900 dark:text-white"
      >
        Page Breakdown
      </motion.h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Page list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <h3 className="mb-3 px-2 text-sm font-medium text-gray-900/60 dark:text-white/60">
            Pages
          </h3>
          <div className="space-y-1">
            {pages.map((p) => (
              <button
                key={p.path}
                onClick={() => setSelectedPath(p.path)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedPath === p.path
                    ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                    : "text-gray-900/60 hover:bg-gray-900/5 dark:text-white/60 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex justify-between">
                  <span className="truncate">{p.path}</span>
                  <span className="ml-2 text-gray-900/40 dark:text-white/40">
                    {p.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chart */}
        <div className="lg:col-span-2">
          <AreaChartCard
            title={selectedPath ? `Views: ${selectedPath}` : "Select A Page"}
            data={pathViews}
            dataKey="count"
            xKey="date"
          />
        </div>
      </div>
    </div>
  );
}
