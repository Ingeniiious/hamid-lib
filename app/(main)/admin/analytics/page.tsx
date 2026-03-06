"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Eye, UsersThree, UserPlus, Lightning } from "@phosphor-icons/react";
import { StatsCard } from "@/components/admin/StatsCard";
import { AreaChartCard } from "@/components/admin/charts/AreaChartCard";
import { BarChartCard } from "@/components/admin/charts/BarChartCard";
import { PieChartCard } from "@/components/admin/charts/PieChartCard";
import {
  getOverviewStats,
  getPageViewsOverTime,
  getTopPages,
  getDeviceBreakdown,
  getGeoBreakdown,
  getRealtimeVisitors,
  getReferrerStats,
  getUserGrowth,
} from "./actions";

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

export default function AnalyticsPage() {
  const { from, to } = getLast30Days();
  const [stats, setStats] = useState({ totalViews: 0, uniqueVisitors: 0, newUsers: 0 });
  const [realtime, setRealtime] = useState(0);
  const [viewsOverTime, setViewsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [topPages, setTopPages] = useState<{ path: string; count: number }[]>([]);
  const [devices, setDevices] = useState<{ name: string; count: number }[]>([]);
  const [browsers, setBrowsers] = useState<{ name: string; count: number }[]>([]);
  const [geo, setGeo] = useState<{ country: string; count: number }[]>([]);
  const [referrers, setReferrers] = useState<{ referrer: string; count: number }[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [s, rt, vot, tp, db, g, r, ug] = await Promise.all([
        getOverviewStats(from, to),
        getRealtimeVisitors(),
        getPageViewsOverTime(from, to, "day"),
        getTopPages(from, to),
        getDeviceBreakdown(from, to),
        getGeoBreakdown(from, to),
        getReferrerStats(from, to),
        getUserGrowth(from, to),
      ]);
      setStats(s);
      setRealtime(rt);
      setViewsOverTime(vot);
      setTopPages(tp);
      setDevices(db.devices);
      setBrowsers(db.browsers);
      setGeo(g);
      setReferrers(r);
      setUserGrowth(ug);
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
        Analytics
      </motion.h2>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Real-Time Visitors"
          value={realtime}
          icon={<Lightning size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Total Views"
          value={stats.totalViews}
          icon={<Eye size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Unique Visitors"
          value={stats.uniqueVisitors}
          icon={<UsersThree size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="New Users"
          value={stats.newUsers}
          icon={<UserPlus size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AreaChartCard
          title="Page Views (Last 30 Days)"
          data={viewsOverTime}
          dataKey="count"
          xKey="date"
          index={0}
        />
        <AreaChartCard
          title="User Growth"
          data={userGrowth}
          dataKey="count"
          xKey="date"
          index={1}
        />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Top Pages"
          data={topPages}
          dataKey="count"
          nameKey="path"
          index={0}
        />
        <PieChartCard
          title="Devices"
          data={devices}
          dataKey="count"
          nameKey="name"
          index={1}
        />
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard
          title="Browsers"
          data={browsers}
          dataKey="count"
          nameKey="name"
          index={0}
        />
        {/* Geo table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <h3 className="mb-4 text-sm font-medium text-gray-900/60 dark:text-white/60">
            Top Countries
          </h3>
          <div className="space-y-2">
            {geo.map((g) => (
              <div
                key={g.country}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-900 dark:text-white">
                  {g.country}
                </span>
                <span className="text-gray-900/50 dark:text-white/50">
                  {g.count}
                </span>
              </div>
            ))}
            {geo.length === 0 && (
              <p className="text-sm text-gray-900/40 dark:text-white/40">
                No data yet.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Referrers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <h3 className="mb-4 text-sm font-medium text-gray-900/60 dark:text-white/60">
          Top Referrers
        </h3>
        <div className="space-y-2">
          {referrers.map((r) => (
            <div
              key={r.referrer}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate text-gray-900 dark:text-white">
                {r.referrer}
              </span>
              <span className="ml-4 text-gray-900/50 dark:text-white/50">
                {r.count}
              </span>
            </div>
          ))}
          {referrers.length === 0 && (
            <p className="text-sm text-gray-900/40 dark:text-white/40">
              No referrer data yet.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
