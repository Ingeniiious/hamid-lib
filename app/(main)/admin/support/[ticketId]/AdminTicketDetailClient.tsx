"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { TicketConversation } from "@/components/support/TicketConversation";
import { OptionPicker } from "@/components/OptionPicker";
import { getAdminTicketDetail, addAdminReply, updateTicketStatus } from "../actions";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function AdminTicketDetailClient({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { locale } = useTranslation();
  const isRtl = locale === "fa";
  const [data, setData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const lastFetchedAt = useRef(Date.now());

  const fetchData = useCallback(async () => {
    const result = await getAdminTicketDetail(ticketId);
    if (!result) {
      router.push("/admin/support");
      return;
    }
    setData(result);
    lastFetchedAt.current = Date.now();
  }, [ticketId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling: every 10s + on window focus
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/support/poll?ticketId=${ticketId}&since=${lastFetchedAt.current}`);
        const json = await res.json();
        if (json.changed) fetchData();
      } catch {}
    };

    const interval = setInterval(poll, 10000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", poll);
    };
  }, [ticketId, fetchData]);

  const handleSend = (text: string) => {
    startTransition(async () => {
      await addAdminReply(ticketId, text);
      await fetchData();
    });
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      await updateTicketStatus(ticketId, newStatus);
      await fetchData();
    });
  };

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-1/3 mx-auto animate-pulse rounded-xl bg-gray-900/5 dark:bg-white/5" />
        <div className="h-[400px] animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
      </div>
    );
  }

  const { ticket, messages } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-6 p-6"
    >
      {/* Back */}
      <div className="flex justify-center">
        <button
          onClick={() => router.push("/admin/support")}
          className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
        >
          &larr; Back To Support
        </button>
      </div>

      {/* Ticket info card */}
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 dir={isRtl ? "rtl" : undefined} className="text-xl font-semibold text-gray-900 dark:text-white">
              {ticket.subject}
            </h1>
            <div dir={isRtl ? "rtl" : undefined} className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <TicketStatusBadge status={ticket.status} />
              <span className="text-sm capitalize text-gray-900/50 dark:text-white/50">
                {ticket.category}
              </span>
              <span className="text-sm capitalize text-gray-900/50 dark:text-white/50">
                {ticket.priority} priority
              </span>
            </div>
            <p dir={isRtl ? "rtl" : undefined} className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
              {ticket.userName} ({ticket.userEmail}) · {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}
            </p>
          </div>
          <div className="w-48">
            <OptionPicker
              options={statusOptions}
              value={ticket.status}
              onChange={handleStatusChange}
              placeholder="Status"
            />
          </div>
        </div>
      </div>

      {/* Conversation */}
      <TicketConversation
        messages={messages}
        onSendMessage={handleSend}
        isPending={isPending}
        senderRole="admin"
      />
    </motion.div>
  );
}
