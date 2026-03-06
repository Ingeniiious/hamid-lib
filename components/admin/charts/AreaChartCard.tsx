"use client";

import { motion } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface AreaChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  index?: number;
}

export function AreaChartCard({
  title,
  data,
  dataKey,
  xKey,
  index = 0,
}: AreaChartCardProps) {
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
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="oklch(0.55 0.24 275)"
              fill="oklch(0.55 0.24 275 / 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <p className="flex h-[200px] items-center justify-center text-sm text-gray-900/40 dark:text-white/40">
          No data yet.
        </p>
      )}
    </motion.div>
  );
}
