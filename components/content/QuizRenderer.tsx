"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MultipleChoice } from "./question-types/MultipleChoice";
import { TrueFalse } from "./question-types/TrueFalse";
import { FullscreenExam } from "./FullscreenExam";
import { submitQuizAttempt } from "@/lib/practice";
import type { QuizContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface QuizRendererProps {
  content: QuizContent;
  contentId?: string;
  courseId?: string;
  courseTitle?: string;
  mode?: "preview" | "interactive";
}

interface QuizResult {
  answers: (number | null)[];
  score: number;
  total: number;
  perQuestion: { correct: boolean; correctIndex: number }[];
  elapsedSeconds: number;
}

type Phase = "lobby" | "confirm-start" | "active" | "review" | "results";

export function QuizRenderer({ content, contentId, courseId, courseTitle, mode = "interactive" }: QuizRendererProps) {
  const questions = content.questions ?? [];
  const timeLimit = content.suggestedTimeMinutes ?? 0;

  const [phase, setPhase] = useState<Phase>("lobby");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null),
  );
  const [result, setResult] = useState<QuizResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Timer
  useEffect(() => {
    if (phase !== "active") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startTimeRef.current = Date.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);

      // Auto-submit when time runs out
      if (timeLimit > 0 && secs >= timeLimit * 60) {
        handleSubmit();
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const mcCount = useMemo(
    () => questions.filter((q) => q.type === "multiple_choice").length,
    [questions],
  );
  const tfCount = useMemo(
    () => questions.filter((q) => q.type === "true_false").length,
    [questions],
  );

  const answeredCount = useMemo(
    () => answers.filter((a) => a !== null).length,
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

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let score = 0;
    const perQuestion = questions.map((q, i) => {
      const correct = answers[i] === q.correctIndex;
      if (correct) score++;
      return { correct, correctIndex: q.correctIndex };
    });
    const quizResult: QuizResult = {
      answers: [...answers],
      score,
      total: questions.length,
      perQuestion,
      elapsedSeconds: elapsed,
    };
    setResult(quizResult);
    setPhase("results");

    // Save to database (fire-and-forget)
    if (contentId && courseId) {
      submitQuizAttempt({
        contentId,
        courseId,
        contentType: "quiz",
        answers: answers.map((a, i) => ({ questionIndex: i, selectedIndex: a })),
        score,
        total: questions.length,
        perQuestion,
        timeSpentSeconds: elapsed,
      }).catch(() => {});
    }
  }, [answers, questions, elapsed, contentId, courseId]);

  const handleStart = () => {
    setPhase("confirm-start");
  };

  const handleConfirmStart = () => {
    setPhase("active");
    setCurrentQ(0);
    setElapsed(0);
    setAnswers(new Array(questions.length).fill(null));
    setResult(null);
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCancelConfirm(false);
    setPhase("lobby");
    setCurrentQ(0);
    setElapsed(0);
    setAnswers(new Array(questions.length).fill(null));
    setResult(null);
  };

  const handleReset = () => {
    setPhase("lobby");
    setCurrentQ(0);
    setElapsed(0);
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

  // ─── Lobby + Confirm Start (crossfade) ────────────────────
  if (phase === "lobby" || phase === "confirm-start") {
    const stats = [
      { label: "Questions", value: String(questions.length) },
      ...(timeLimit > 0 ? [{ label: "Time Limit", value: `${timeLimit} Min` }] : []),
      ...(mcCount > 0 ? [{ label: "Multiple Choice", value: String(mcCount) }] : []),
      ...(tfCount > 0 ? [{ label: "True / False", value: String(tfCount) }] : []),
    ];

    return (
      <AnimatePresence mode="wait">
        {phase === "lobby" ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mx-auto max-w-2xl"
          >
            <div className="rounded-3xl border border-gray-900/10 bg-white/50 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="font-display text-2xl font-light text-gray-900 dark:text-white">
                Quiz
              </p>
              <div className="mx-auto mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <StatCard key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
              {mode === "interactive" && (
                <button
                  onClick={handleStart}
                  className="mt-8 rounded-full bg-[#5227FF] px-10 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                >
                  Start Quiz
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mx-auto max-w-sm"
          >
            <div className="rounded-3xl border border-gray-900/10 bg-white/50 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="font-display text-xl font-light text-gray-900 dark:text-white">
                Ready To Start?
              </p>
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
                Once you start, the timer will begin{timeLimit > 0 ? ` and you will have ${timeLimit} minutes` : ""}. Make sure you are ready before proceeding.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleConfirmStart}
                  className="w-full rounded-full bg-[#5227FF] px-8 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                >
                  Yes, Start Quiz
                </button>
                <button
                  onClick={() => setPhase("lobby")}
                  className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ─── Active ──────────────────────────────────────────────
  if (phase === "active") {
    const q = questions[currentQ];
    const remaining = timeLimit > 0 ? Math.max(0, timeLimit * 60 - elapsed) : null;

    return (
      <FullscreenExam
        title="Quiz"
        courseTitle={courseTitle}
        elapsed={elapsed}
        remaining={remaining}
        onCancel={handleCancel}
      >
        <div className="flex flex-1 flex-col">
          {/* Top: progress */}
          <div className="shrink-0 px-4 pt-4 sm:px-8 sm:pt-6">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-2">
              <span className="font-display text-base font-light text-gray-900/70 sm:text-lg dark:text-white/70">
                Question {currentQ + 1} Of {questions.length}
              </span>
              <div className="h-2 w-52 overflow-hidden rounded-full bg-gray-900/5 sm:h-2.5 sm:w-72 dark:bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-[#5227FF]"
                  animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.4, ease }}
                />
              </div>
            </div>
          </div>

          {/* Center: question card — vertically centered */}
          <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
            <div className="w-full max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease }}
                  className="rounded-3xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl sm:p-10 dark:border-white/15 dark:bg-white/10"
                >
                  {q.type === "true_false" ? (
                    <TrueFalse
                      question={q.question}
                      selectedIndex={answers[currentQ]}
                      onSelect={(idx) => handleSelect(currentQ, idx)}
                      disabled={false}
                      questionNumber={currentQ + 1}
                    />
                  ) : (
                    <MultipleChoice
                      question={q.question}
                      options={q.options}
                      selectedIndex={answers[currentQ]}
                      onSelect={(idx) => handleSelect(currentQ, idx)}
                      disabled={false}
                      questionNumber={currentQ + 1}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom: navigation + indicator */}
          <div className="shrink-0 px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentQ((p) => Math.max(p - 1, 0))}
                  disabled={currentQ === 0}
                  className="rounded-full bg-gray-900/5 px-6 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 disabled:opacity-30 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                >
                  Previous
                </button>

                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ((p) => Math.min(p + 1, questions.length - 1))}
                    className="rounded-full bg-[#5227FF] px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setPhase("review")}
                    className="rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                  >
                    Review Answers
                  </button>
                )}
              </div>
              <p className="text-center text-xs text-gray-900/40 dark:text-white/40">
                {answeredCount} Of {questions.length} Answered
              </p>
            </div>
          </div>
        </div>
        {/* Cancel confirmation overlay */}
        {showCancelConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease }}
              className="mx-4 max-w-sm rounded-3xl border border-gray-900/10 bg-white p-8 text-center shadow-2xl dark:border-white/15 dark:bg-gray-900"
            >
              <p className="font-display text-lg font-light text-gray-900 dark:text-white">
                Cancel Quiz?
              </p>
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
                Your answers will not be saved. All progress will be lost.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleConfirmCancel}
                  className="w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
                >
                  Yes, Cancel Quiz
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                >
                  Continue Quiz
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </FullscreenExam>
    );
  }

  // ─── Review ──────────────────────────────────────────────
  if (phase === "review") {
    const remaining = timeLimit > 0 ? Math.max(0, timeLimit * 60 - elapsed) : null;
    const unanswered = answers.map((a, i) => a === null ? i : -1).filter((i) => i !== -1);

    return (
      <FullscreenExam
        title="Quiz"
        courseTitle={courseTitle}
        elapsed={elapsed}
        remaining={remaining}
        onCancel={handleCancel}
      >
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
            <div className="w-full max-w-2xl">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease }}
                className="rounded-3xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-white/10"
              >
                <p className="font-display text-xl font-light text-gray-900 dark:text-white">
                  Review Your Answers
                </p>

                {/* Answer grid */}
                <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-2">
                  {questions.map((_, i) => {
                    const answered = answers[i] !== null;
                    return (
                      <button
                        key={i}
                        onClick={() => { setCurrentQ(i); setPhase("active"); }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                          answered
                            ? "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
                            : "border border-gray-900/10 text-gray-900/40 dark:border-white/10 dark:text-white/40"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 space-y-1">
                  <p className="text-sm text-gray-900/70 dark:text-white/70">
                    {answeredCount} Of {questions.length} Answered
                  </p>
                  {unanswered.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {unanswered.length} Question{unanswered.length > 1 ? "s" : ""} Unanswered
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    className="w-full rounded-full bg-[#5227FF] px-8 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                  >
                    Submit Quiz
                  </button>
                  <button
                    onClick={() => setPhase("active")}
                    className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                  >
                    Go Back To Questions
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Cancel confirm overlay (shared) */}
          {showCancelConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease }}
                className="mx-4 max-w-sm rounded-3xl border border-gray-900/10 bg-white p-8 text-center shadow-2xl dark:border-white/15 dark:bg-gray-900"
              >
                <p className="font-display text-lg font-light text-gray-900 dark:text-white">
                  Cancel Quiz?
                </p>
                <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
                  Your answers will not be saved. All progress will be lost.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={handleConfirmCancel}
                    className="w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
                  >
                    Yes, Cancel Quiz
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                  >
                    Continue Quiz
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </FullscreenExam>
    );
  }

  // ─── Results ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Score banner */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className={`rounded-3xl p-8 text-center ${
            result.score === result.total
              ? "bg-green-500/10 dark:bg-green-500/15"
              : result.score >= result.total * 0.7
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-red-500/10 dark:bg-red-500/15"
          }`}
        >
          <span className="block font-display text-4xl font-light text-gray-900 dark:text-white">
            {result.score} / {result.total}
          </span>
          <span className="mt-1 block text-sm text-gray-900/60 dark:text-white/60">
            {Math.round((result.score / result.total) * 100)}% Correct
          </span>
          <span className="mt-1 block text-xs text-gray-900/40 dark:text-white/40">
            Completed In {formatTime(result.elapsedSeconds)}
          </span>
        </motion.div>
      )}

      {/* Review — all questions with answers revealed */}
      {result &&
        questions.map((q, qIdx) => (
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
                selectedIndex={result.answers[qIdx]}
                correctIndex={q.correctIndex}
                showResult
                onSelect={() => {}}
                disabled
                questionNumber={qIdx + 1}
              />
            ) : (
              <MultipleChoice
                question={q.question}
                options={q.options}
                selectedIndex={result.answers[qIdx]}
                correctIndex={q.correctIndex}
                showResult
                onSelect={() => {}}
                disabled
                questionNumber={qIdx + 1}
              />
            )}

            {q.explanation && (
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
                    {result.perQuestion[qIdx].correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="mt-1 text-center text-xs text-gray-900/60 dark:text-white/60">
                  {q.explanation}
                </p>
              </motion.div>
            )}
          </motion.div>
        ))}

      {/* Retake */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleReset}
          className="rounded-full bg-gray-900/5 px-8 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-gray-900/[0.03] px-4 py-4 dark:bg-white/[0.03]">
      <span className="text-lg font-semibold text-gray-900 dark:text-white">{value}</span>
      <span className="text-[10px] text-gray-900/50 dark:text-white/50">{label}</span>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
