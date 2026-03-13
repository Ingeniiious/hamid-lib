"use client";

import { motion } from "framer-motion";

interface TrueFalseProps {
  question: string;
  selectedIndex: number | null;
  correctIndex?: number;
  showResult?: boolean;
  onSelect: (index: number) => void;
  disabled?: boolean;
  points?: number;
  questionNumber: number;
}

export function TrueFalse({
  question,
  selectedIndex,
  correctIndex,
  showResult,
  onSelect,
  disabled,
  points,
  questionNumber,
}: TrueFalseProps) {
  const options = ["True", "False"];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-center gap-2 text-center">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5227FF]/10 text-[11px] font-bold text-[#5227FF] dark:text-[#8B6FFF]">
          {questionNumber}
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {question}
        </p>
        {points !== undefined && (
          <span className="shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
            {points} pt{points !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="mx-auto flex max-w-xs items-center justify-center gap-3">
        {options.map((label, idx) => {
          let bg = "bg-gray-900/5 dark:bg-white/5";
          let text = "text-gray-900/70 dark:text-white/70";
          let border = "border-transparent";

          if (showResult && correctIndex !== undefined) {
            if (idx === correctIndex) {
              bg = "bg-green-500/10 dark:bg-green-500/15";
              text = "text-green-700 dark:text-green-400";
              border = "border-green-500/30";
            } else if (idx === selectedIndex && idx !== correctIndex) {
              bg = "bg-red-500/10 dark:bg-red-500/15";
              text = "text-red-700 dark:text-red-400";
              border = "border-red-500/30";
            }
          } else if (selectedIndex === idx) {
            bg = "bg-[#5227FF]/10 dark:bg-[#5227FF]/20";
            text = "text-[#5227FF] dark:text-[#8B6FFF]";
            border = "border-[#5227FF]/30 dark:border-[#8B6FFF]/30";
          }

          return (
            <motion.button
              key={idx}
              whileHover={disabled ? {} : { scale: 1.02 }}
              onClick={() => !disabled && onSelect(idx)}
              disabled={disabled}
              className={`flex-1 rounded-full border px-6 py-2 text-center text-sm font-medium transition-all ${bg} ${text} ${border} ${
                disabled
                  ? "cursor-default"
                  : "cursor-pointer hover:opacity-90"
              }`}
            >
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
