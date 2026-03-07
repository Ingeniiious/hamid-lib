"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarBlank,
  Clock,
  Users,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/admin/StatsCard";
import { DataTable } from "@/components/admin/DataTable";
import { listCalendarSeries } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type SeriesRow = Awaited<
  ReturnType<typeof listCalendarSeries>
>["series"][number];

const categoryColors: Record<string, string> = {
  class: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  exam: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  deadline:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  reminder:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
};

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface CalendarClientProps {
  stats: {
    totalSeries: number;
    totalIndividual: number;
    eventsToday: number;
    uniqueUsers: number;
    activeRecurring: number;
  };
}

export function CalendarClient({ stats }: CalendarClientProps) {
  const router = useRouter();
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listCalendarSeries({
        search: debouncedSearch || undefined,
        category: filterCategory || undefined,
        page,
      });
      setSeries(result.series);
      setTotalPages(result.totalPages);
    });
  }, [page, debouncedSearch, filterCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (item: SeriesRow) => (
        <div className="min-w-0">
          <span className="font-medium">{item.title}</span>
          {item.note && (
            <p className="mt-0.5 max-w-xs truncate text-xs text-gray-900/40 dark:text-white/40">
              {item.note}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "userName",
      header: "User",
      render: (item: SeriesRow) => (
        <div>
          <p className="text-sm">{item.userName}</p>
          <p className="text-xs text-gray-900/40 dark:text-white/40">
            {item.userEmail}
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (item: SeriesRow) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {item.startTime} – {item.endTime}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      render: (item: SeriesRow) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {formatDate(item.firstDate)}
          {item.firstDate !== item.lastDate && ` → ${formatDate(item.lastDate)}`}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item: SeriesRow) => (
        <Badge
          variant="outline"
          className={
            categoryColors[item.category] ||
            "border-gray-900/10 dark:border-white/15"
          }
        >
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </Badge>
      ),
    },
    {
      key: "recurrence",
      header: "Recurrence",
      render: (item: SeriesRow) =>
        item.recurrence !== "none" ? (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
            >
              {item.recurrence}
            </Badge>
            <span className="text-xs text-gray-900/50 dark:text-white/50">
              {item.occurrences}x
            </span>
          </div>
        ) : (
          <span className="text-gray-900/30 dark:text-white/30">{"\u2014"}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Schedules"
          value={stats.totalSeries}
          icon={<CalendarBlank size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Events Today"
          value={stats.eventsToday}
          icon={<Clock size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Unique Users"
          value={stats.uniqueUsers}
          icon={<Users size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Recurring Series"
          value={stats.activeRecurring}
          icon={<ArrowsClockwise size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
      >
        <div className="flex gap-1">
          {["", "class", "exam", "deadline", "reminder"].map((c) => (
            <button
              key={c}
              onClick={() => {
                setFilterCategory(c);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filterCategory === c
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-900/5 text-gray-900/60 hover:text-gray-900 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      </motion.div>

      <DataTable<SeriesRow>
        columns={columns}
        data={series}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={(v) => setSearch(v)}
        searchPlaceholder="Search by title, user name, or email..."
        onRowClick={(item) => router.push(`/admin/calendar/${item.groupId}`)}
        loading={isPending && series.length === 0}
        emptyMessage="No calendar events yet."
      />
    </div>
  );
}
