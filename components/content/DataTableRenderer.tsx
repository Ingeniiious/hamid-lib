"use client";

import { motion } from "framer-motion";
import type { DataTableContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface DataTableRendererProps {
  content: DataTableContent;
}

export function DataTableRenderer({ content }: DataTableRendererProps) {
  const headers = content.headers ?? [];
  const rows = content.rows ?? [];

  if (headers.length === 0 && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Data Available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <div className="overflow-x-auto">
          {/* Header row */}
          {headers.length > 0 && (
            <div className="flex min-w-max border-b border-gray-900/10 bg-[#5227FF]/5 dark:border-white/10 dark:bg-[#5227FF]/10">
              {headers.map((header, hi) => (
                <div
                  key={hi}
                  className="flex-1 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]"
                  style={{ minWidth: "140px" }}
                >
                  {header}
                </div>
              ))}
            </div>
          )}

          {/* Data rows */}
          {rows.map((row, ri) => (
            <motion.div
              key={ri}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease, delay: ri * 0.03 }}
              className={`flex min-w-max ${
                ri < rows.length - 1
                  ? "border-b border-gray-900/5 dark:border-white/5"
                  : ""
              } ${
                ri % 2 === 1
                  ? "bg-gray-900/[0.02] dark:bg-white/[0.02]"
                  : ""
              }`}
            >
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  className="flex-1 px-5 py-3 text-center text-sm text-gray-900/70 dark:text-white/70"
                  style={{ minWidth: "140px" }}
                >
                  {cell}
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footnotes */}
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
              >
                {note}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
