"use client";

import { motion } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const COLORS = [
  "oklch(0.55 0.24 275)",
  "oklch(0.65 0.20 330)",
  "oklch(0.60 0.18 200)",
  "oklch(0.70 0.15 140)",
  "oklch(0.50 0.22 30)",
  "oklch(0.75 0.12 80)",
];

interface PieChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  index?: number;
}

export function PieChartCard({
  title,
  data,
  dataKey,
  nameKey,
  index = 0,
}: PieChartCardProps) {
  const config = Object.fromEntries(
    data.map((d, i) => [
      String(d[nameKey]),
      { label: String(d[nameKey]), color: COLORS[i % COLORS.length] },
    ])
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: index * 0.1 }}
      className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
    >
      <h3 className="mb-4 text-sm font-medium text-gray-900/60 dark:text-white/60">
        {title}
      </h3>
      {data.length > 0 ? (
        <div className="flex items-center gap-6">
          <ChartContainer config={config} className="h-[180px] w-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex-1 space-y-1.5">
            {data.map((d, i) => (
              <div
                key={String(d[nameKey])}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-gray-900/70 dark:text-white/70">
                  {String(d[nameKey])}
                </span>
                <span className="ml-auto text-gray-900/40 dark:text-white/40">
                  {String(d[dataKey])}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="flex h-[180px] items-center justify-center text-sm text-gray-900/40 dark:text-white/40">
          No data yet.
        </p>
      )}
    </motion.div>
  );
}
