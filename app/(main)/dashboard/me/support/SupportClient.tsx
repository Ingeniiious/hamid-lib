"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { OptionPicker } from "@/components/OptionPicker";
import { listMyTickets, createTicket } from "./actions";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

const categories = ["general", "technical", "billing", "content", "bug"] as const;
const priorities = ["low", "medium", "high"] as const;

export function SupportClient() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isRtl = locale === "fa";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<string>("medium");
  const [textareaHeight, setTextareaHeight] = useState(100);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    const newHeight = Math.max(100, Math.min(el.scrollHeight, 400));
    el.style.height = `${newHeight}px`;
    setTextareaHeight(newHeight);
  }, []);

  const fetchTickets = async (p: number) => {
    setLoading(true);
    try {
      const data = await listMyTickets(p);
      setTickets(data.tickets);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, []);

  const handleCreate = () => {
    if (!subject.trim() || !message.trim()) return;
    startTransition(async () => {
      const ticketId = await createTicket(subject.trim(), message.trim(), category, priority);
      resetForm();
      router.push(`/dashboard/me/support/${ticketId}`);
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setSubject("");
    setMessage("");
    setCategory("general");
    setPriority("medium");
    setTextareaHeight(100);
  };

  // Portal the modal to document.body so it escapes any stacking context
  const modal = (
    <AnimatePresence>
      {showForm && (
        <>
          {/* Backdrop — full viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={resetForm}
          />

          {/* Centering container */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease }}
              className="pointer-events-auto w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-900/10 bg-white p-7 shadow-xl dark:border-white/15 dark:bg-[var(--background)] sm:p-8"
            >
              <h3 className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
                {t("support.newTicket")}
              </h3>

              <div className="mt-6 space-y-4">
                {/* Subject */}
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("support.subject")}
                  className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 transition-colors placeholder:text-gray-900/40 hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
                />

                {/* Category + Priority row */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-center text-xs font-medium text-gray-900/50 dark:text-white/50">
                      {t("support.category")}
                    </p>
                    <OptionPicker
                      options={categories.map((key) => ({
                        value: key,
                        label: t(`support.category${key.charAt(0).toUpperCase() + key.slice(1)}` as any),
                      }))}
                      value={category}
                      onChange={setCategory}
                      placeholder={t("support.category")}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-center text-xs font-medium text-gray-900/50 dark:text-white/50">
                      {t("support.priority")}
                    </p>
                    <OptionPicker
                      options={priorities.map((p) => ({
                        value: p,
                        label: t(`support.priority${p.charAt(0).toUpperCase() + p.slice(1)}` as any),
                      }))}
                      value={priority}
                      onChange={setPriority}
                      placeholder={t("support.priority")}
                    />
                  </div>
                </div>

                {/* Message — smooth auto-expanding */}
                <motion.div
                  animate={{ height: textareaHeight }}
                  transition={{ duration: 0.3, ease }}
                  className="overflow-hidden rounded-2xl"
                >
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      autoResize();
                    }}
                    placeholder={t("support.message")}
                    className="h-full w-full resize-none rounded-2xl border border-gray-900/15 bg-gray-900/5 px-5 py-4 text-center text-sm text-gray-900 transition-colors placeholder:text-gray-900/40 hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
                    style={{ height: textareaHeight }}
                  />
                </motion.div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetForm}
                    className="flex-1 rounded-full bg-gray-900/5 py-2.5 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!subject.trim() || !message.trim() || isPending}
                    className="flex-1 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? t("support.creating") : t("support.createTicket")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-6"
    >
      {/* New Ticket Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90"
        >
          {t("support.newTicket")}
        </button>
      </div>

      {/* Portal modal to body — escapes transform stacking context */}
      {mounted && createPortal(modal, document.body)}

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5"
            />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center" dir={isRtl ? "rtl" : undefined}>
          <p className="text-lg font-medium text-gray-900/60 dark:text-white/60">
            {t("support.noTickets")}
          </p>
          <p className="mt-1 text-sm text-gray-900/40 dark:text-white/40">
            {t("support.noTicketsDesc")}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="space-y-3"
          >
            {tickets.map((ticket) => (
              <motion.button
                key={ticket.id}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2, ease }}
                onClick={() => router.push(`/dashboard/me/support/${ticket.id}`)}
                className="w-full rounded-2xl border border-gray-900/10 bg-white/50 p-4 text-center backdrop-blur-xl transition-colors hover:bg-gray-900/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p dir={isRtl ? "rtl" : undefined} className="truncate text-center font-medium text-gray-900 dark:text-white">
                      {ticket.subject}
                    </p>
                    <p dir={isRtl ? "rtl" : undefined} className="mt-1 text-center text-xs text-gray-900/40 dark:text-white/40">
                      {new Date(ticket.createdAt).toLocaleDateString()} · {ticket.messageCount}{" "}
                      {ticket.messageCount === 1 ? "message" : "messages"}
                    </p>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => fetchTickets(page - 1)}
            disabled={page <= 1}
            className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 disabled:opacity-50 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            {t("contribute.previous")}
          </button>
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchTickets(page + 1)}
            disabled={page >= totalPages}
            className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 disabled:opacity-50 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            {t("contribute.next")}
          </button>
        </div>
      )}
    </motion.div>
  );
}
