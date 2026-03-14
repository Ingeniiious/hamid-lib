"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SlideContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface SlideRendererProps {
  content: SlideContent;
}

export function SlideRenderer({ content }: SlideRendererProps) {
  const slides = content.slides ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const goNext = useCallback(() => {
    setNotesExpanded(false);
    setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setNotesExpanded(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (slides.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Slides Available
        </p>
      </div>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Slide card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          {/* Slide number badge */}
          <div className="flex items-center justify-center pt-5">
            <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
              Slide {currentIndex + 1} Of {slides.length}
            </span>
          </div>

          {/* Title */}
          <div className="px-6 pt-4 pb-2">
            <h3 className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
              {slide.title}
            </h3>
          </div>

          {/* Bullets */}
          {slide.bullets && slide.bullets.length > 0 && (
            <div className="px-6 pb-5">
              <ul className="space-y-2">
                {slide.bullets.map((bullet, bi) => (
                  <li
                    key={bi}
                    className="flex items-start justify-center gap-2 text-center"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5227FF] dark:bg-[#8B6FFF]" />
                    <span className="text-sm text-gray-900/70 dark:text-white/70">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes (collapsible) */}
          {slide.notes && (
            <div className="border-t border-gray-900/5 dark:border-white/5">
              <button
                onClick={() => setNotesExpanded((prev) => !prev)}
                className="flex w-full items-center justify-center gap-2 p-3 text-center transition-colors hover:bg-gray-900/[0.02] dark:hover:bg-white/[0.02]"
              >
                <span className="text-xs font-medium text-gray-900/40 dark:text-white/40">
                  Speaker Notes
                </span>
                <span className="text-xs text-gray-900/30 dark:text-white/30">
                  {notesExpanded ? "−" : "+"}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {notesExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4">
                      <p className="text-center text-sm leading-relaxed text-gray-900/50 dark:text-white/50">
                        {slide.notes}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 disabled:opacity-30 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          Previous
        </button>
        <span className="text-sm font-medium text-gray-900/50 dark:text-white/50">
          {currentIndex + 1} / {slides.length}
        </span>
        <button
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 disabled:opacity-30 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
