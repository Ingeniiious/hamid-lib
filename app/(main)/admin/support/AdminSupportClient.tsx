"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        15,
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

  const statCards = [
    { label: "Open", value: stats.open, color: "text-blue-600 dark:text-blue-400" },
    { label: "Awaiting Reply", value: stats.awaiting, color: "text-amber-600 dark:text-amber-400" },
    { label: "Resolved", value: stats.resolved, color: "text-green-600 dark:text-green-400" },
    { label: "Total", value: stats.total, color: "text-gray-900 dark:text-white" },
  ];

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-6 p-6"
    >
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Support</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
          >
            <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full ${
              statusFilter === f.value
                ? "bg-[#5227FF] text-white hover:opacity-90"
                : "border-gray-900/10 dark:border-white/15"
            }`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Data table */}
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
  );
}
