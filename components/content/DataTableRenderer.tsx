"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { DataTableContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface DataTableRendererProps {
  content: DataTableContent;
}

export function DataTableRenderer({ content }: DataTableRendererProps) {
  const headers = content.headers ?? [];
  const rows = content.rows ?? [];
  const [fullscreen, setFullscreen] = useState(false);

  if (headers.length === 0 && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Data Available
        </p>
      </div>
    );
  }

  const tableContent = (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center">
        {headers.length > 0 && (
          <thead>
            <tr className="border-b border-gray-900/10 bg-[#5227FF]/5 dark:border-white/10 dark:bg-[#5227FF]/10">
              {headers.map((header, hi) => (
                <th
                  key={hi}
                  className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-gray-900/5 last:border-b-0 dark:border-white/5 ${
                ri % 2 === 1
                  ? "bg-gray-900/[0.02] dark:bg-white/[0.02]"
                  : ""
              }`}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-5 py-3 text-sm text-gray-900/80 dark:text-white/80"
                  style={{ textWrap: "balance" }}
                >
                  {cell}
                </td>
              ))}
              {row.length < headers.length &&
                Array.from({ length: headers.length - row.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="px-5 py-3" />
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-4">
          {/* Expand button above the table */}
        <div className="flex justify-end">
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gray-900/5 px-3.5 py-1.5 text-[11px] font-medium text-gray-900/60 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            aria-label="View full screen"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1h4v4M5 13H1V9M13 1L8.5 5.5M1 13l4.5-4.5" />
            </svg>
            Expand
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease }}
          className="overflow-hidden rounded-3xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          {tableContent}
        </motion.div>

        {content.footnotes && content.footnotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease, delay: 0.2 }}
            className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
              Footnotes
            </p>
            <div className="space-y-1">
              {content.footnotes.map((note, ni) => (
                <p
                  key={ni}
                  className="text-center text-xs text-gray-900/50 dark:text-white/50"
                  style={{ textWrap: "balance" }}
                >
                  {note}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Fullscreen portal — always mounted so AnimatePresence can animate exit */}
      {createPortal(
        <AnimatePresence>
          {fullscreen && (
            <motion.div
              key="datatable-fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="fixed inset-0 z-[9999] flex flex-col bg-[var(--background)]"
            >
              {/* Navbar */}
              <div className="grid shrink-0 grid-cols-3 items-center border-b border-gray-900/10 px-4 py-3 sm:px-8 sm:py-4 dark:border-white/10">
                <div>
                  <span className="font-display text-base font-light text-gray-900 sm:text-xl dark:text-white">
                    Data Table
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-xs text-gray-900/50 dark:text-white/50">
                    {rows.length} Rows · {headers.length} Columns
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <ThemeToggle />
                  <button
                    onClick={() => setFullscreen(false)}
                    className="rounded-full border border-gray-900/10 px-4 py-1.5 text-xs font-medium text-gray-900/70 transition-all hover:bg-gray-900/5 sm:px-5 sm:py-2 sm:text-sm dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-8">
                <div className="overflow-hidden rounded-3xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                  {tableContent}
                </div>

                {/* Footnotes in fullscreen */}
                {content.footnotes && content.footnotes.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                    <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
                      Footnotes
                    </p>
                    <div className="space-y-1">
                      {content.footnotes.map((note, ni) => (
                        <p
                          key={ni}
                          className="text-center text-xs text-gray-900/50 dark:text-white/50"
                          style={{ textWrap: "balance" }}
                        >
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
