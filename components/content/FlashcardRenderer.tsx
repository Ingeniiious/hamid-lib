"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { FlashcardContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FlashcardRendererProps {
  content: FlashcardContent;
}

export function FlashcardRenderer({ content }: FlashcardRendererProps) {
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const cards = content.cards ?? [];

  const toggleFlip = useCallback((idx: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1));
  }, [currentIndex, cards.length]);

  const goPrev = useCallback(() => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [currentIndex]);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Flashcards Available
        </p>
      </div>
    );
  }

  const currentTags = cards[currentIndex]?.tags;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setViewMode("single")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            viewMode === "single"
              ? "bg-[#5227FF] text-white"
              : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          }`}
        >
          Single Card
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            viewMode === "grid"
              ? "bg-[#5227FF] text-white"
              : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          }`}
        >
          Grid View
        </button>
      </div>

      {viewMode === "single" ? (
        /* Single card mode */
        <div className="space-y-4">
          <div className="mx-auto w-[260px] sm:w-[280px]">
            <FlipCard
              front={cards[currentIndex].front}
              back={cards[currentIndex].back}
              isFlipped={flippedCards.has(currentIndex)}
              onFlip={() => toggleFlip(currentIndex)}
              contentKey={currentIndex}
            />
          </div>

          {/* Tags — below the card, above navigation */}
          <AnimatePresence mode="wait">
            {currentTags && currentTags.length > 0 && (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease }}
                className="flex flex-wrap items-center justify-center gap-1.5"
              >
                {currentTags.map((tag, ti) => (
                  <Badge
                    key={ti}
                    variant="secondary"
                    className="rounded-full bg-gray-900/5 px-3 py-0.5 text-[10px] font-medium text-gray-900/60 dark:bg-white/5 dark:text-white/60"
                  >
                    {tag}
                  </Badge>
                ))}
              </motion.div>
            )}
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
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === cards.length - 1}
              className="rounded-full bg-gray-900/5 px-5 py-2 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 disabled:opacity-30 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        /* Grid mode */
        <div className="flex flex-wrap items-start justify-center gap-4">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease, delay: idx * 0.03 }}
              className="w-[200px] sm:w-[220px]"
            >
              <FlipCard
                front={card.front}
                back={card.back}
                isFlipped={flippedCards.has(idx)}
                onFlip={() => toggleFlip(idx)}
                compact
              />
              {/* Tags below each grid card */}
              {card.tags && card.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  {card.tags.map((tag, ti) => (
                    <Badge
                      key={ti}
                      variant="secondary"
                      className="rounded-full bg-gray-900/5 px-2 py-0 text-[8px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlipCard({
  front,
  back,
  isFlipped,
  onFlip,
  compact,
  contentKey,
}: {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  compact?: boolean;
  contentKey?: number;
}) {
  return (
    <div
      className="cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={onFlip}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative aspect-[2.5/3.5]"
      >
        {/* Front face */}
        <div
          className="absolute inset-0 flex flex-col rounded-2xl border border-gray-900/10 bg-white/50 px-5 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
            Question
          </p>
          <div className="flex flex-1 items-center justify-center px-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={`front-${contentKey ?? front}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
                className={`font-medium text-gray-900 dark:text-white ${compact ? "text-xs" : "text-sm"}`}
              >
                {front}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="mb-4 text-[10px] text-gray-900/30 dark:text-white/30">
            Click To Flip
          </p>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex flex-col rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 px-5 text-center backdrop-blur-xl dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="mt-5 text-[9px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
            Answer
          </p>
          <div className="flex flex-1 items-center justify-center px-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={`back-${contentKey ?? back}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
                className={`text-gray-900 dark:text-white ${compact ? "text-xs" : "text-sm"}`}
              >
                {back}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="mb-4 text-[10px] text-gray-900/30 dark:text-white/30">
            Click To Flip Back
          </p>
        </div>
      </motion.div>
    </div>
  );
}
