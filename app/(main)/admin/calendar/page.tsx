"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/DataTable";
import { getAllCalendarEvents } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CalendarEventItem {
  id: string;
  userId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  note: string | null;
  recurrence: string;
  seriesId: string | null;
  userName: string;
  userEmail: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "class", label: "Class" },
  { value: "exam", label: "Exam" },
  { value: "deadline", label: "Deadline" },
  { value: "reminder", label: "Reminder" },
];

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
    // dateStr is YYYY-MM-DD
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("all");

  const loadData = useCallback(
    (
      currentPage: number,
      filters: { dateFrom?: string; dateTo?: string; category?: string }
    ) => {
      startTransition(async () => {
        const result = await getAllCalendarEvents({
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          category:
            filters.category && filters.category !== "all"
              ? filters.category
              : undefined,
          page: currentPage,
          limit: 20,
        });
        setEvents(result.events);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      });
    },
    []
  );

  const [debouncedFilters, setDebouncedFilters] = useState({ dateFrom, dateTo, category });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({ dateFrom, dateTo, category });
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, category]);

  useEffect(() => {
    loadData(page, debouncedFilters);
  }, [page, debouncedFilters, loadData]);

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (item: CalendarEventItem) => (
        <div>
          <p className="text-sm font-medium">{item.title}</p>
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
      render: (item: CalendarEventItem) => (
        <div>
          <p className="text-sm">{item.userName}</p>
          <p className="text-xs text-gray-900/40 dark:text-white/40">
            {item.userEmail}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (item: CalendarEventItem) => (
        <span className="text-sm text-gray-900/80 dark:text-white/80">
          {formatDate(item.date)}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (item: CalendarEventItem) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {item.startTime} - {item.endTime}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item: CalendarEventItem) => (
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
      render: (item: CalendarEventItem) => (
        <span className="text-sm text-gray-900/60 dark:text-white/60">
          {item.recurrence === "none" ? "-" : item.recurrence}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Calendar Events
        </h2>
        {total > 0 && (
          <span className="text-sm text-gray-900/50 dark:text-white/50">
            {total} event{total !== 1 ? "s" : ""}
          </span>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="flex flex-wrap items-end gap-4"
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-900/60 dark:text-white/60">
            From
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40 rounded-xl border-gray-900/10 bg-white/50 text-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-900/60 dark:text-white/60">
            To
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40 rounded-xl border-gray-900/10 bg-white/50 text-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-900/60 dark:text-white/60">
            Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-44 rounded-xl border-gray-900/10 bg-white/50 text-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <DataTable<CalendarEventItem>
        columns={columns}
        data={events}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isPending && events.length === 0}
        emptyMessage="No calendar events found."
      />
    </div>
  );
}
