"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/admin/StatsCard";
import { AreaChartCard } from "@/components/admin/charts/AreaChartCard";
import { Users, UserPlus } from "@phosphor-icons/react";
import { getOverviewStats, getUserGrowth } from "../actions";

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

export default function AnalyticsUsersPage() {
  const { from, to } = getLast30Days();
  const [stats, setStats] = useState({ totalViews: 0, uniqueVisitors: 0, newUsers: 0 });
  const [growth, setGrowth] = useState<{ date: string; count: number }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [s, g] = await Promise.all([
        getOverviewStats(from, to),
        getUserGrowth(from, to),
      ]);
      setStats(s);
      setGrowth(g);
    });
  }, [from, to]);

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-2xl font-light text-gray-900 dark:text-white"
      >
        User Analytics
      </motion.h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatsCard
          title="Unique Visitors (30d)"
          value={stats.uniqueVisitors}
          icon={<Users size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="New Users (30d)"
          value={stats.newUsers}
          icon={<UserPlus size={24} weight="duotone" />}
          index={1}
        />
      </div>

      <AreaChartCard
        title="User Growth (Last 30 Days)"
        data={growth}
        dataKey="count"
        xKey="date"
      />
    </div>
  );
}
