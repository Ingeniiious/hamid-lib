"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FullscreenExamProps {
  title: string;
  courseTitle?: string;
  elapsed: number;
  remaining: number | null;
  onCancel: () => void;
  children: React.ReactNode;
}

export function FullscreenExam({
  title,
  courseTitle,
  elapsed,
  remaining,
  onCancel,
  children,
}: FullscreenExamProps) {
  const timerValue = remaining !== null ? remaining : elapsed;
  const timerUrgent = remaining !== null && remaining <= 60;
  const timerWarning = remaining !== null && remaining <= 120 && remaining > 60;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease }}
        className="fixed inset-0 z-[9999] flex flex-col bg-[var(--background)]"
      >
        {/* Navbar — 3-column grid for perfect center alignment */}
        <div className="grid shrink-0 grid-cols-3 items-center border-b border-gray-900/10 px-4 py-3 sm:px-8 sm:py-4 dark:border-white/10">
          {/* Left: title + course */}
          <div className="flex items-center gap-2 overflow-hidden sm:gap-3">
            <h1 className="truncate font-display text-base font-light text-gray-900 sm:text-xl dark:text-white">
              {title}
            </h1>
            {courseTitle && (
              <span className="hidden truncate font-display text-sm text-gray-900/40 lg:inline dark:text-white/40">
                {courseTitle}
              </span>
            )}
          </div>

          {/* Center: timer — always perfectly centered */}
          <div className="flex items-center justify-center">
            <span
              className={`font-display text-xl font-light tabular-nums sm:text-2xl ${
                timerUrgent
                  ? "text-red-600 dark:text-red-400"
                  : timerWarning
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-900 dark:text-white"
              }`}
            >
              {formatTime(timerValue)}
            </span>
          </div>

          {/* Right: theme toggle + cancel */}
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <button
              onClick={onCancel}
              className="rounded-full border border-gray-900/10 px-4 py-1.5 text-xs font-medium text-gray-900/70 transition-all hover:bg-gray-900/5 sm:px-5 sm:py-2 sm:text-sm dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
