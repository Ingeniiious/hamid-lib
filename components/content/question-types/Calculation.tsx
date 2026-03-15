"use client";

interface CalculationProps {
  question: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  points?: number;
  questionNumber: number;
  feedback?: string;
  verdict?: "correct" | "partial" | "incorrect";
}

export function Calculation({
  question,
  value,
  onChange,
  disabled,
  points,
  questionNumber,
  feedback,
  verdict,
}: CalculationProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-center">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5227FF]/10 text-[11px] font-bold text-[#5227FF] dark:text-[#8B6FFF]">
          {questionNumber}
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white" style={{ textWrap: "balance" }}>
          {question}
        </p>
        {points !== undefined && (
          <span className="shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
            {points} pt{points !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="mx-auto max-w-xl">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Show your work and calculations..."
          rows={4}
          className={`w-full resize-none rounded-2xl border bg-white/50 px-4 py-3 text-center text-sm text-gray-900 placeholder:text-gray-900/30 focus:border-[#5227FF] focus:outline-none focus:ring-2 focus:ring-[#5227FF]/20 disabled:opacity-60 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#8B6FFF] dark:focus:ring-[#8B6FFF]/20 ${
            verdict === "correct"
              ? "border-green-500/30"
              : verdict === "partial"
                ? "border-amber-500/30"
                : verdict === "incorrect"
                  ? "border-red-500/30"
                  : "border-gray-900/10 dark:border-white/15"
          }`}
        />
        {feedback && (
          <p
            className={`mt-2 text-center text-xs ${
              verdict === "correct"
                ? "text-green-600 dark:text-green-400"
                : verdict === "partial"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
