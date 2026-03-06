"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import { DataTable } from "@/components/admin/DataTable";
import { getAuditLogs } from "./actions";
import { formatDistanceToNow } from "date-fns";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface AuditEntry {
  id: number;
  adminName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const columns: { key: string; header: string; render?: (item: AuditEntry) => React.ReactNode }[] = [
  {
    key: "createdAt",
    header: "Time",
    render: (item) =>
      formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }),
  },
  { key: "adminName", header: "Admin" },
  { key: "action", header: "Action" },
  {
    key: "entityType",
    header: "Entity",
    render: (item) =>
      item.entityType
        ? `${item.entityType}${item.entityId ? ` #${item.entityId}` : ""}`
        : "—",
  },
  {
    key: "ipAddress",
    header: "IP",
    render: (item) => item.ipAddress || "—",
  },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(
    (p: number, s: string) => {
      startTransition(async () => {
        const data = await getAuditLogs({
          action: s || undefined,
          page: p,
        });
        setLogs(data.logs);
        setTotalPages(data.totalPages);
      });
    },
    []
  );

  useEffect(() => {
    loadData(page, debouncedSearch);
  }, [page, debouncedSearch, loadData]);

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="font-display text-2xl font-light text-gray-900 dark:text-white"
      >
        Audit Log
      </motion.h2>

      <DataTable
        columns={columns}
        data={logs}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Filter by action..."
        loading={isPending}
        emptyMessage="No audit log entries yet."
      />
    </div>
  );
}
