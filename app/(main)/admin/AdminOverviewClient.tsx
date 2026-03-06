"use client";

import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  PresentationChart,
  Lightning,
} from "@phosphor-icons/react";
import { StatsCard } from "@/components/admin/StatsCard";
import { formatDistanceToNow } from "date-fns";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface OverviewProps {
  stats: {
    totalUsers: number;
    activeToday: number;
    totalCourses: number;
    totalPresentations: number;
  };
  recentAudit: {
    id: number;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }[];
}

export function AdminOverviewClient({ stats, recentAudit }: OverviewProps) {
  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Active Today"
          value={stats.activeToday}
          icon={<Lightning size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={<BookOpen size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Total Presentations"
          value={stats.totalPresentations}
          icon={<PresentationChart size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <h3 className="mb-4 font-display text-lg font-light text-gray-900 dark:text-white">
          Recent Activity
        </h3>

        {recentAudit.length === 0 ? (
          <p className="text-sm text-gray-900/50 dark:text-white/50">
            No recent activity yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recentAudit.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {entry.action}
                  </p>
                  {entry.entityType && (
                    <p className="text-xs text-gray-900/50 dark:text-white/50">
                      {entry.entityType}
                      {entry.entityId ? ` #${entry.entityId}` : ""}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-900/40 dark:text-white/40">
                  {formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
