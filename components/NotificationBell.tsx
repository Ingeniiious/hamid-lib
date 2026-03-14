"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const POLL_INTERVAL = 60_000; // 60 seconds

interface Notification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (full = false) => {
    try {
      const res = await fetch(
        `/api/notifications/inbox?limit=${full ? 20 : 0}&offset=0`
      );
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount);
      if (full) setNotifications(data.notifications);
    } catch {}
  }, []);

  // Initial load + polling for unread count
  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch full list when opening
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications(true).finally(() => setLoading(false));
    }
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications/inbox", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {}
    }

    if (notif.url) {
      setOpen(false);
      router.push(notif.url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative rounded-full p-3 text-gray-900/70 transition-colors duration-300 hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
        aria-label="Notifications"
      >
        {/* Phosphor Duotone Bell */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 256 256"
          className="text-current"
        >
          <path
            d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192Z"
            opacity="0.2"
            fill="currentColor"
          />
          <path
            d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"
            fill="currentColor"
          />
        </svg>

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ ease: EASE, duration: 0.2 }}
              className="absolute -top-0.5 -right-0.5 bg-[#5227FF] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ ease: EASE, duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-900/15 bg-white/70 backdrop-blur-xl dark:border-white/20 dark:bg-white/10 shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("notifications.title")}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#5227FF] hover:underline"
                >
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>

            {/* Content with cross-fade */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {[0, 1, 2].map((i) => (
                    <SkeletonNotification key={i} delay={i * 0.15} />
                  ))}
                </motion.div>
              ) : notifications.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="p-8 text-center text-sm text-gray-400"
                >
                  {t("notifications.empty")}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {notifications.map((notif, i) => (
                    <motion.button
                      key={notif.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !notif.isRead
                          ? "bg-[#5227FF]/5 dark:bg-[#5227FF]/10"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 text-center">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center">
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Skeleton shimmer notification row ─── */

function SkeletonNotification({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      className="px-4 py-3 flex flex-col items-center gap-2"
    >
      {/* Title bone */}
      <ShimmerBone className="h-3.5 w-36 rounded-full" />
      {/* Body bone — two lines */}
      <ShimmerBone className="h-2.5 w-52 rounded-full" />
      <ShimmerBone className="h-2.5 w-40 rounded-full" />
      {/* Timestamp bone */}
      <ShimmerBone className="h-2 w-14 rounded-full mt-0.5" />
    </motion.div>
  );
}

function ShimmerBone({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
      className={className}
      style={{
        background:
          "linear-gradient(90deg, rgba(128,128,128,0.08) 25%, rgba(128,128,128,0.18) 50%, rgba(128,128,128,0.08) 75%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
