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

// ─── Cancel Confirmation Overlay ───────────────────────────

interface CancelOverlayProps {
  show: boolean;
  label: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CancelOverlay({ show, label, onConfirm, onDismiss }: CancelOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease }}
            className="mx-4 max-w-sm rounded-3xl border border-gray-900/10 bg-white p-8 text-center shadow-2xl dark:border-white/15 dark:bg-gray-900"
          >
            <p className="font-display text-lg font-light text-gray-900 dark:text-white">
              Cancel {label}?
            </p>
            <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
              Your answers will not be saved. All progress will be lost.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={onConfirm}
                className="w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
              >
                Yes, Cancel {label}
              </button>
              <button
                onClick={onDismiss}
                className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
              >
                Continue {label}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
