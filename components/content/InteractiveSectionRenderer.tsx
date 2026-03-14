"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { InteractiveSectionContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface InteractiveSectionRendererProps {
  content: InteractiveSectionContent;
}

export function InteractiveSectionRenderer({
  content,
}: InteractiveSectionRendererProps) {
  const blocks = content.blocks ?? [];
  const [revealedBlocks, setRevealedBlocks] = useState<Set<number>>(new Set());
  const [toggledBlocks, setToggledBlocks] = useState<Set<number>>(new Set());

  const toggleReveal = useCallback((idx: number) => {
    setRevealedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const toggleBlock = useCallback((idx: number) => {
    setToggledBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Interactive Content Available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {blocks.map((block, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: idx * 0.05 }}
        >
          {block.type === "text" && <TextBlock content={block.content} />}

          {block.type === "question" && (
            <QuestionBlock content={block.content} />
          )}

          {block.type === "reveal" && (
            <RevealBlock
              content={block.content}
              isRevealed={revealedBlocks.has(idx)}
              onToggle={() => toggleReveal(idx)}
              interaction={block.interaction}
            />
          )}

          {block.type === "code" && <CodeBlock content={block.content} />}

          {block.type === "callout" && (
            <CalloutBlock
              content={block.content}
              interaction={block.interaction}
              isToggled={toggledBlocks.has(idx)}
              onToggle={() => toggleBlock(idx)}
            />
          )}

          {block.type === "diagram" && (
            <DiagramBlock content={block.content} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Block Components ---------- */

function TextBlock({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
        {content}
      </p>
    </div>
  );
}

function QuestionBlock({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#5227FF]/20 bg-white/50 p-5 backdrop-blur-xl dark:border-[#8B6FFF]/20 dark:bg-white/10">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
        Question
      </p>
      <p className="text-center text-sm font-medium leading-relaxed text-gray-900 dark:text-white">
        {content}
      </p>
    </div>
  );
}

function RevealBlock({
  content,
  isRevealed,
  onToggle,
  interaction,
}: {
  content: string;
  isRevealed: boolean;
  onToggle: () => void;
  interaction?: string;
}) {
  const isClickToReveal =
    !interaction || interaction === "click_to_reveal";

  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      {isClickToReveal ? (
        <>
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center p-5 text-center transition-colors hover:bg-gray-900/[0.02] dark:hover:bg-white/[0.02]"
          >
            <span className="rounded-full bg-[#5227FF] px-5 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90">
              {isRevealed ? "Hide Answer" : "Click To Reveal"}
            </span>
          </button>

          {isRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease }}
              className="px-5 pb-5"
            >
              <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                {content}
              </p>
            </motion.div>
          )}
        </>
      ) : (
        <div className="p-5">
          <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      <p className="px-5 pt-4 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
        Code
      </p>
      <pre className="overflow-x-auto px-5 pb-5 pt-2">
        <code className="block whitespace-pre-wrap break-words text-center font-mono text-xs leading-relaxed text-gray-900/80 dark:text-white/80">
          {content}
        </code>
      </pre>
    </div>
  );
}

function CalloutBlock({
  content,
  interaction,
  isToggled,
  onToggle,
}: {
  content: string;
  interaction?: string;
  isToggled: boolean;
  onToggle: () => void;
}) {
  const isToggleType = interaction === "toggle";

  if (isToggleType) {
    return (
      <div className="rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 p-5 text-center transition-colors hover:bg-[#5227FF]/[0.03] dark:hover:bg-[#5227FF]/[0.05]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
            Callout
          </p>
          <span className="text-xs text-[#5227FF]/50 dark:text-[#8B6FFF]/50">
            {isToggled ? "−" : "+"}
          </span>
        </button>

        {isToggled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease }}
            className="px-5 pb-5"
          >
            <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
              {content}
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 p-5 dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
        Callout
      </p>
      <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
        {content}
      </p>
    </div>
  );
}

function DiagramBlock({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-900/15 bg-gray-900/[0.02] p-5 dark:border-white/15 dark:bg-white/[0.02]">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
        Diagram
      </p>
      <p className="text-center text-sm leading-relaxed text-gray-900/60 dark:text-white/60">
        {content}
      </p>
    </div>
  );
}
