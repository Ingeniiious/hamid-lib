"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  awaiting_reply: {
    label: "Awaiting Reply",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  },
};

export function TicketStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open;
  return (
    <Badge
      variant="secondary"
      className={`rounded-full border-0 px-3 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
