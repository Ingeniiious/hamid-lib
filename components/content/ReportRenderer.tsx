"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReportContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface ReportRendererProps {
  content: ReportContent;
}

export function ReportRenderer({ content }: ReportRendererProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(
    new Set(),
  );

  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const sections = content.sections ?? [];
  const references = content.references ?? [];

  if (!content.title && sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Report Available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Title + abstract card */}
      {(content.title || content.abstract) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease }}
          className="rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 p-6 backdrop-blur-xl dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10"
        >
          {content.title && (
            <h2 className="text-center font-display text-xl font-light text-gray-900 dark:text-white">
              {content.title}
            </h2>
          )}
          {content.abstract && (
            <div className="mt-3">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                Abstract
              </p>
              <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                {content.abstract}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Collapsible sections */}
      {sections.map((section, idx) => {
        const isCollapsed = collapsedSections.has(idx);

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease, delay: idx * 0.05 }}
            className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(idx)}
              className="flex w-full items-center justify-center gap-2 p-5 text-center transition-colors hover:bg-gray-900/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5227FF]/10 text-[11px] font-bold text-[#5227FF] dark:text-[#8B6FFF]">
                {idx + 1}
              </span>
              <h3 className="font-display text-base font-light text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <span className="text-xs text-gray-900/30 dark:text-white/30">
                {isCollapsed ? "+" : "−"}
              </span>
            </button>

            {/* Section body */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5">
                    <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                      {section.content}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* References */}
      {references.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: sections.length * 0.05 }}
          className="rounded-2xl border border-gray-900/10 bg-gray-900/[0.02] p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
            References
          </p>
          <ol className="space-y-1.5">
            {references.map((ref, ri) => (
              <li
                key={ri}
                className="flex items-start justify-center gap-2 text-center"
              >
                <span className="mt-0.5 shrink-0 text-xs font-medium text-[#5227FF]/60 dark:text-[#8B6FFF]/60">
                  [{ri + 1}]
                </span>
                <span className="text-xs text-gray-900/60 dark:text-white/60">
                  {ref}
                </span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </div>
  );
}
