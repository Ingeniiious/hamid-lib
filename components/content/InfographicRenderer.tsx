"use client";

import { motion } from "framer-motion";
import type { InfographicContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface InfographicRendererProps {
  content: InfographicContent;
}

export function InfographicRenderer({ content }: InfographicRendererProps) {
  const sections = content.sections ?? [];

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Infographic Available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {sections.map((section, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: idx * 0.05 }}
          className="relative rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          {/* Chart type badge */}
          {section.chartType && (
            <div className="mb-3 flex items-center justify-center">
              <span className="rounded-full bg-[#5227FF]/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                {section.chartType}
              </span>
            </div>
          )}

          {/* Section number + title */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5227FF]/10 text-[11px] font-bold text-[#5227FF] dark:text-[#8B6FFF]">
              {idx + 1}
            </span>
            <h3 className="font-display text-base font-light text-gray-900 dark:text-white">
              {section.title}
            </h3>
          </div>

          {/* Data content */}
          <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
            {section.data}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
