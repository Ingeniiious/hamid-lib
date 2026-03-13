"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Headset, Clock, CheckCircle, Envelope } from "@phosphor-icons/react";
import { StatsCard } from "@/components/admin/StatsCard";
import { DataTable } from "@/components/admin/DataTable";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { listAllTickets } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Stats {
  total: number;
  open: number;
  awaiting: number;
  resolved: number;
}

const statusFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function AdminSupportClient({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = async (p: number) => {
    setLoading(true);
    try {
      const data = await listAllTickets(
        statusFilter !== "all" ? statusFilter : undefined,
        p,
        25,
        search || undefined
      );
      setTickets(data.tickets);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [statusFilter, search]);

  const columns = [
    { key: "subject", header: "Subject" },
    { key: "userName", header: "User" },
    { key: "category", header: "Category", render: (item: any) => (
      <span className="capitalize">{item.category}</span>
    )},
    { key: "priority", header: "Priority", render: (item: any) => (
      <span className={`capitalize ${item.priority === "high" ? "text-red-500" : ""}`}>{item.priority}</span>
    )},
    { key: "status", header: "Status", render: (item: any) => (
      <TicketStatusBadge status={item.status} />
    )},
    { key: "lastMessageAt", header: "Last Message", render: (item: any) => (
      <span className="text-sm text-gray-900/60 dark:text-white/60">
        {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : "\u2014"}
      </span>
    )},
    { key: "createdAt", header: "Created", render: (item: any) => (
      <span className="text-sm text-gray-900/60 dark:text-white/60">
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "\u2014"}
      </span>
    )},
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
      >
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Support
        </h2>
        <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
          {stats.total} total ticket{stats.total !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Open"
          value={stats.open}
          icon={<Envelope size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Awaiting Reply"
          value={stats.awaiting}
          icon={<Clock size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircle size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Total Tickets"
          value={stats.total}
          icon={<Headset size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Status filter tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="flex justify-center"
      >
        <div className="inline-flex gap-1 rounded-full border border-gray-900/10 bg-white/50 p-1 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                  : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Data table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.5 }}
      >
        <DataTable
          columns={columns}
          data={tickets}
          page={page}
          totalPages={totalPages}
          onPageChange={fetchTickets}
          searchValue={search}
          onSearch={setSearch}
          searchPlaceholder="Search by subject..."
          onRowClick={(item: any) => router.push(`/admin/support/${item.id}`)}
          loading={loading}
          emptyMessage="No support tickets found."
        />
      </motion.div>
    </div>
  );
}
