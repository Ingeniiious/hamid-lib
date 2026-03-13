"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StudyGuideContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface StudyGuideRendererProps {
  content: StudyGuideContent;
}

export function StudyGuideRenderer({ content }: StudyGuideRendererProps) {
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

  if (!content.sections || content.sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Sections In This Study Guide
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {content.sections.map((section, idx) => {
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
                  <div className="space-y-4 px-5 pb-5">
                    {/* Content paragraphs */}
                    {section.content && (
                      <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                        {section.content}
                      </p>
                    )}

                    {/* Key points */}
                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <div className="rounded-xl bg-[#5227FF]/5 p-4 dark:bg-[#5227FF]/10">
                        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                          Key Points
                        </p>
                        <ul className="space-y-1.5">
                          {section.keyPoints.map((point, pi) => (
                            <li
                              key={pi}
                              className="flex items-start justify-center gap-2 text-center"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5227FF] dark:bg-[#8B6FFF]" />
                              <span className="text-sm text-gray-900/80 dark:text-white/80">
                                {point}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Examples */}
                    {section.examples && section.examples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
                          Examples
                        </p>
                        {section.examples.map((example, ei) => (
                          <div
                            key={ei}
                            className="rounded-xl bg-gray-900/[0.03] p-3 dark:bg-white/[0.03]"
                          >
                            <p className="text-center text-sm text-gray-900/70 dark:text-white/70">
                              {example}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
