"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MultipleChoice } from "./question-types/MultipleChoice";
import { TrueFalse } from "./question-types/TrueFalse";
import type { QuizContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface QuizRendererProps {
  content: QuizContent;
  mode?: "preview" | "interactive";
}

interface QuizResult {
  answers: (number | null)[];
  score: number;
  total: number;
  perQuestion: { correct: boolean; correctIndex: number }[];
}

export function QuizRenderer({ content, mode = "interactive" }: QuizRendererProps) {
  const questions = content.questions ?? [];
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null),
  );
  const [result, setResult] = useState<QuizResult | null>(null);

  const allAnswered = useMemo(
    () => answers.every((a) => a !== null),
    [answers],
  );

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (result) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    let score = 0;
    const perQuestion = questions.map((q, i) => {
      const correct = answers[i] === q.correctIndex;
      if (correct) score++;
      return { correct, correctIndex: q.correctIndex };
    });
    setResult({ answers: [...answers], score, total: questions.length, perQuestion });
  };

  const handleReset = () => {
    setAnswers(new Array(questions.length).fill(null));
    setResult(null);
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Questions In This Quiz
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Timer / info bar */}
      {content.suggestedTimeMinutes > 0 && (
        <div className="text-center">
          <span className="rounded-full bg-gray-900/5 px-3 py-1 text-[11px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
            Suggested Time: {content.suggestedTimeMinutes} Minutes
          </span>
        </div>
      )}

      {/* Score banner */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className={`rounded-2xl p-6 text-center ${
            result.score === result.total
              ? "bg-green-500/10 dark:bg-green-500/15"
              : result.score >= result.total * 0.7
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-red-500/10 dark:bg-red-500/15"
          }`}
        >
          <span className="block font-display text-3xl font-light text-gray-900 dark:text-white">
            {result.score} / {result.total}
          </span>
          <span className="mt-1 block text-sm text-gray-900/60 dark:text-white/60">
            {Math.round((result.score / result.total) * 100)}% Correct
          </span>
        </motion.div>
      )}

      {/* Questions */}
      {questions.map((q, qIdx) => (
        <motion.div
          key={qIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease, delay: qIdx * 0.03 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          {q.type === "true_false" ? (
            <TrueFalse
              question={q.question}
              selectedIndex={answers[qIdx]}
              correctIndex={result ? q.correctIndex : undefined}
              showResult={!!result}
              onSelect={(idx) => handleSelect(qIdx, idx)}
              disabled={!!result || mode === "preview"}
              questionNumber={qIdx + 1}
            />
          ) : (
            <MultipleChoice
              question={q.question}
              options={q.options}
              selectedIndex={answers[qIdx]}
              correctIndex={result ? q.correctIndex : undefined}
              showResult={!!result}
              onSelect={(idx) => handleSelect(qIdx, idx)}
              disabled={!!result || mode === "preview"}
              questionNumber={qIdx + 1}
            />
          )}

          {/* Explanation after submit */}
          {result && q.explanation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease }}
              className="mt-3 rounded-xl bg-gray-900/[0.02] p-3 dark:bg-white/[0.02]"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`text-sm ${
                    result.perQuestion[qIdx].correct
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {result.perQuestion[qIdx].correct ? "✓" : "✗"}
                </span>
              </div>
              <p className="mt-1 text-center text-xs text-gray-900/60 dark:text-white/60">
                {q.explanation}
              </p>
            </motion.div>
          )}
        </motion.div>
      ))}

      {/* Submit / Reset */}
      {mode === "interactive" && (
        <div className="flex items-center justify-center gap-3">
          {!result ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="rounded-full bg-gray-900/5 px-8 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              Retake Quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}
