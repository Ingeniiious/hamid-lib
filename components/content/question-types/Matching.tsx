"use client";

interface MatchingProps {
  question: string;
  matchPairs: { left: string; right: string }[];
  selectedOrder: number[];
  correctMatchOrder?: number[];
  showResult?: boolean;
  onSelect: (pairIndex: number, rightIndex: number) => void;
  disabled?: boolean;
  points?: number;
  questionNumber: number;
}

export function Matching({
  question,
  matchPairs,
  selectedOrder,
  correctMatchOrder,
  showResult,
  onSelect,
  disabled,
  points,
  questionNumber,
}: MatchingProps) {
  const rightOptions = matchPairs.map((p) => p.right);

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
      <div className="mx-auto max-w-lg space-y-2">
        {matchPairs.map((pair, idx) => {
          const selectedVal = selectedOrder[idx] ?? -1;
          const isCorrect =
            showResult &&
            correctMatchOrder &&
            selectedVal === correctMatchOrder[idx];
          const isIncorrect =
            showResult &&
            correctMatchOrder &&
            selectedVal !== -1 &&
            selectedVal !== correctMatchOrder[idx];

          return (
            <div
              key={idx}
              className="flex items-center justify-center gap-3"
            >
              <span className="flex-1 text-right text-sm text-gray-900 dark:text-white">
                {pair.left}
              </span>
              <span className="text-gray-900/30 dark:text-white/30">&rarr;</span>
              <select
                value={selectedVal}
                onChange={(e) => onSelect(idx, Number(e.target.value))}
                disabled={disabled}
                className={`flex-1 rounded-full border bg-white/50 px-3 py-1.5 text-center text-sm text-gray-900 focus:border-[#5227FF] focus:outline-none focus:ring-2 focus:ring-[#5227FF]/20 disabled:opacity-60 dark:bg-white/5 dark:text-white dark:focus:border-[#8B6FFF] dark:focus:ring-[#8B6FFF]/20 ${
                  isCorrect
                    ? "border-green-500/30"
                    : isIncorrect
                      ? "border-red-500/30"
                      : "border-gray-900/10 dark:border-white/15"
                }`}
              >
                <option value={-1}>Select...</option>
                {rightOptions.map((opt, ri) => (
                  <option key={ri} value={ri}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
