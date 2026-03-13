"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { TicketConversation } from "@/components/support/TicketConversation";
import { getTicketDetail, addUserMessage } from "../actions";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface TicketData {
  ticket: {
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
  };
  messages: {
    id: number;
    senderType: string;
    senderId: string | null;
    message: string;
    isAiGenerated: boolean;
    createdAt: string;
  }[];
}

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "fa";
  const [data, setData] = useState<TicketData | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastFetchedAt = useRef(Date.now());

  const fetchData = useCallback(async () => {
    const result = await getTicketDetail(ticketId);
    setData(result);
    lastFetchedAt.current = Date.now();
  }, [ticketId]);

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
      await addUserMessage(ticketId, text);
      await fetchData();
    });
  };

  if (!data) {
    return (
      <div className="space-y-4 pt-8">
        <div className="h-8 w-2/3 mx-auto animate-pulse rounded-xl bg-gray-900/5 dark:bg-white/5" />
        <div className="h-[400px] animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
      </div>
    );
  }

  const { ticket, messages } = data;
  const categoryLabel = t(`support.category${ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}` as any) || ticket.category;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2 pt-4 text-center">
        <h1 dir={isRtl ? "rtl" : undefined} className="text-xl font-semibold text-gray-900 dark:text-white">
          {ticket.subject}
        </h1>
        <div dir={isRtl ? "rtl" : undefined} className="flex items-center justify-center gap-3">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-sm text-gray-900/40 dark:text-white/40">
            {categoryLabel}
          </span>
          <span className="text-sm text-gray-900/40 dark:text-white/40">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Conversation */}
      <TicketConversation
        messages={messages}
        onSendMessage={handleSend}
        isPending={isPending}
        senderRole="user"
      />

      <BackButton href="/dashboard/me/support" label={t("support.title")} floating />
    </motion.div>
  );
}
