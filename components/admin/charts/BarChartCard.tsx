"use client";

import { motion } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface BarChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  index?: number;
}

export function BarChartCard({
  title,
  data,
  dataKey,
  nameKey,
  index = 0,
}: BarChartCardProps) {
  const config = {
    [dataKey]: { label: title, color: "oklch(0.55 0.24 275)" },
  };

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
        <ChartContainer config={config} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey={dataKey}
              fill="oklch(0.55 0.24 275)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="flex h-[200px] items-center justify-center text-sm text-gray-900/40 dark:text-white/40">
          No data yet.
        </p>
      )}
    </motion.div>
  );
}
