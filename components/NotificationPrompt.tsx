"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPushSupported, isPushSubscribed, subscribeToPush } from "@/lib/push";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show if push is supported and user hasn't subscribed yet
    if (!isPushSupported()) return;

    isPushSubscribed().then((subscribed) => {
      if (!subscribed && Notification.permission !== "denied") {
        setShow(true);
      }
    });
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const success = await subscribeToPush();
    setLoading(false);
    if (success) setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center gap-3 rounded-2xl border border-gray-900/10 bg-white/60 px-4 py-3 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Turn On Notifications
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
              Get reminders for your calendar events
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShow(false)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/10"
            >
              Later
            </button>
            <button
              onClick={handleEnable}
              disabled={loading}
              className="rounded-full bg-[#5227FF] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : "Enable"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
