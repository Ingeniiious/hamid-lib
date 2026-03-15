"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MultipleChoice } from "./question-types/MultipleChoice";
import { TrueFalse } from "./question-types/TrueFalse";
import { ShortAnswer } from "./question-types/ShortAnswer";
import { FillInBlank } from "./question-types/FillInBlank";
import { Matching } from "./question-types/Matching";
import { Essay } from "./question-types/Essay";
import { Calculation } from "./question-types/Calculation";
import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenExam } from "./FullscreenExam";
import { submitQuizAttempt } from "@/lib/practice";
import type { MockExamContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface QuestionResult {
  questionId: string;
  verdict: "correct" | "partial" | "incorrect";
  pointsEarned: number;
  pointsPossible: number;
  grading: "auto" | "ai";
  feedback?: string;
}

interface GradingResult {
  results: QuestionResult[];
  totalScore: number;
  totalPossible: number;
}

interface MockExamRendererProps {
  content: MockExamContent;
  contentId?: string;
  courseId?: string;
  courseTitle?: string;
  mode?: "preview" | "interactive";
}

type Phase = "lobby" | "confirm-start" | "active" | "review" | "results";

export function MockExamRenderer({
  content,
  contentId,
  courseId,
  courseTitle,
  mode = "interactive",
}: MockExamRendererProps) {
  const sections = content.sections ?? [];
  const timeLimit = content.suggestedTimeMinutes ?? 0;

  const [phase, setPhase] = useState<Phase>("lobby");
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | number[]>>({});
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + s.questions.length, 0),
    [sections],
  );

  const questionTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sections) {
      for (const q of s.questions) {
        const label = q.type.replace(/_/g, " ");
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return counts;
  }, [sections]);

  const answeredCount = useMemo(() => {
    let count = 0;
    for (let si = 0; si < sections.length; si++) {
      for (let qi = 0; qi < sections[si].questions.length; qi++) {
        const key = `s${si}-q${qi}`;
        const val = answers[key];
        if (val !== undefined && val !== "" && val !== -1) {
          if (Array.isArray(val)) {
            if (val.some((v) => v !== -1)) count++;
          } else {
            count++;
          }
        }
      }
    }
    return count;
  }, [answers, sections]);

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
      if (timeLimit > 0 && secs >= timeLimit * 60) {
        handleSubmit();
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const setAnswer = (key: string, value: string | number | number[]) => {
    if (gradingResult) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const getResult = (key: string): QuestionResult | undefined =>
    gradingResult?.results.find((r) => r.questionId === key);

  const handleStart = () => {
    setPhase("confirm-start");
  };

  const handleConfirmStart = () => {
    setPhase("active");
    setCurrentSection(0);
    setElapsed(0);
    setAnswers({});
    setGradingResult(null);
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCancelConfirm(false);
    setPhase("lobby");
    setCurrentSection(0);
    setElapsed(0);
    setAnswers({});
    setGradingResult(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!contentId || grading) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setGrading(true);

    try {
      const res = await fetch("/api/admin/exams/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, answers }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Grading failed:", data.error ?? res.statusText);
        setPhase("results");
        return;
      }

      const data = await res.json();
      const result: GradingResult = {
        results: data.results,
        totalScore: data.totalScore,
        totalPossible: data.totalPossible,
      };
      setGradingResult(result);
      setPhase("results");

      // Save to practice progress
      if (courseId) {
        const scorePct = result.totalPossible > 0
          ? (result.totalScore / result.totalPossible) * 100
          : 0;
        const autoGraded = result.results.filter((r) => r.grading === "auto");
        const autoScore = autoGraded.reduce((s, r) => s + r.pointsEarned, 0);

        submitQuizAttempt({
          contentId,
          courseId,
          contentType: "mock_exam",
          answers: Object.entries(answers).map(([key, val]) => ({
            questionIndex: parseInt(key.split("-q")[1] ?? "0"),
            selectedIndex: typeof val === "number" ? val : null,
          })),
          score: Math.round(result.totalScore),
          total: Math.round(result.totalPossible),
          perQuestion: result.results.map((r) => ({
            correct: r.verdict === "correct",
            correctIndex: -1,
          })),
          timeSpentSeconds: elapsed,
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Grading error:", e);
      setPhase("results");
    } finally {
      setGrading(false);
    }
  }, [contentId, courseId, answers, grading, elapsed]);

  const handleReset = () => {
    setPhase("lobby");
    setCurrentSection(0);
    setElapsed(0);
    setAnswers({});
    setGradingResult(null);
  };

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Sections In This Mock Exam
        </p>
      </div>
    );
  }

  // ─── Lobby + Confirm Start (crossfade) ────────────────────
  if (phase === "lobby" || phase === "confirm-start") {
    const stats = [
      { label: "Total Points", value: String(content.totalPoints) },
      { label: "Questions", value: String(totalQuestions) },
      { label: "Sections", value: String(sections.length) },
      ...(timeLimit > 0 ? [{ label: "Time Limit", value: `${timeLimit} Min` }] : []),
      ...Object.entries(questionTypeBreakdown).map(([type, count]) => ({
        label: type.replace(/\b\w/g, (c) => c.toUpperCase()),
        value: String(count),
      })),
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
                {content.title}
              </p>
              {content.instructions && (
                <p className="mt-3 text-xs text-gray-900/50 dark:text-white/50">
                  {content.instructions}
                </p>
              )}
              <div className="mx-auto mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <StatCard key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
              {mode === "interactive" && contentId && (
                <button
                  onClick={handleStart}
                  className="mt-8 rounded-full bg-[#5227FF] px-10 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
                >
                  Start Exam
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
                  Yes, Start Exam
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
    const section = sections[currentSection];
    const remaining = timeLimit > 0 ? Math.max(0, timeLimit * 60 - elapsed) : null;

    // Calculate global question offset for numbering
    let globalOffset = 0;
    for (let i = 0; i < currentSection; i++) {
      globalOffset += sections[i].questions.length;
    }

    return (
      <FullscreenExam
        title={content.title}
        courseTitle={courseTitle}
        elapsed={elapsed}
        remaining={remaining}
        onCancel={handleCancel}
      >
        <div className="flex flex-1 flex-col">
          {/* Top: section progress */}
          <div className="shrink-0 px-4 pt-4 sm:px-8 sm:pt-6">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-2">
              <span className="font-display text-base font-light text-gray-900/70 sm:text-lg dark:text-white/70">
                Section {currentSection + 1} Of {sections.length}
              </span>
              <div className="h-2 w-52 overflow-hidden rounded-full bg-gray-900/5 sm:h-2.5 sm:w-72 dark:bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-[#5227FF]"
                  animate={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
                  transition={{ duration: 0.4, ease }}
                />
              </div>
            </div>
          </div>

          {/* Center: section content — scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease }}
                >
                  {/* Section header */}
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-[#5227FF] sm:text-base dark:text-[#8B6FFF]">
                      {section.title}
                    </h3>
                    <span className="rounded-full bg-[#5227FF]/10 px-3 py-0.5 text-[10px] font-medium text-[#5227FF] sm:text-xs dark:text-[#8B6FFF]">
                      {section.points} pts
                    </span>
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    {section.questions.map((q, qi) => {
                      const key = `s${currentSection}-q${qi}`;
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, ease, delay: qi * 0.03 }}
                          className="rounded-3xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-white/10"
                        >
                          {renderQuestion(
                            q,
                            currentSection,
                            qi,
                            globalOffset + qi + 1,
                            key,
                            answers,
                            setAnswer,
                            false,
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom: navigation */}
          <div className="shrink-0 px-4 pb-6 sm:px-8 sm:pb-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentSection((p) => Math.max(p - 1, 0))}
                  disabled={currentSection === 0}
                  className="rounded-full bg-gray-900/5 px-6 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 disabled:opacity-30 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                >
                  Previous Section
                </button>

                {currentSection < sections.length - 1 ? (
                  <button
                    onClick={() => setCurrentSection((p) => p + 1)}
                    className="rounded-full bg-[#5227FF] px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                  >
                    Next Section
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
                {answeredCount} Of {totalQuestions} Answered
              </p>
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
                Cancel Exam?
              </p>
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
                Your answers will not be saved. All progress will be lost.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleConfirmCancel}
                  className="w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
                >
                  Yes, Cancel Exam
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                >
                  Continue Exam
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </div>
      </FullscreenExam>
    );
  }

  // ─── Review ──────────────────────────────────────────────
  if (phase === "review") {
    const remaining = timeLimit > 0 ? Math.max(0, timeLimit * 60 - elapsed) : null;

    // Build per-question answer status
    const allQuestions: { sectionIdx: number; questionIdx: number; answered: boolean }[] = [];
    for (let si = 0; si < sections.length; si++) {
      for (let qi = 0; qi < sections[si].questions.length; qi++) {
        const key = `s${si}-q${qi}`;
        const val = answers[key];
        let answered = val !== undefined && val !== "" && val !== -1;
        if (Array.isArray(val)) answered = val.some((v) => v !== -1);
        allQuestions.push({ sectionIdx: si, questionIdx: qi, answered });
      }
    }
    const unansweredCount = allQuestions.filter((q) => !q.answered).length;

    return (
      <FullscreenExam
        title={content.title}
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

                {/* Answer grid grouped by section */}
                <div className="mt-6 space-y-4">
                  {sections.map((section, si) => {
                    const sectionQs = allQuestions.filter((q) => q.sectionIdx === si);
                    let offset = 0;
                    for (let i = 0; i < si; i++) offset += sections[i].questions.length;

                    return (
                      <div key={si}>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                          {section.title}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {sectionQs.map((q, qi) => (
                            <button
                              key={qi}
                              onClick={() => { setCurrentSection(si); setPhase("active"); }}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                                q.answered
                                  ? "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
                                  : "border border-gray-900/10 text-gray-900/40 dark:border-white/10 dark:text-white/40"
                              }`}
                            >
                              {offset + qi + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 space-y-1">
                  <p className="text-sm text-gray-900/70 dark:text-white/70">
                    {answeredCount} Of {totalQuestions} Answered
                  </p>
                  {unansweredCount > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {unansweredCount} Question{unansweredCount > 1 ? "s" : ""} Unanswered
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={grading}
                    className="w-full rounded-full bg-[#5227FF] px-8 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {grading ? "Grading..." : "Submit Exam"}
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

          {/* Cancel confirm overlay */}
          {showCancelConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease }}
                className="mx-4 max-w-sm rounded-3xl border border-gray-900/10 bg-white p-8 text-center shadow-2xl dark:border-white/15 dark:bg-gray-900"
              >
                <p className="font-display text-lg font-light text-gray-900 dark:text-white">
                  Cancel Exam?
                </p>
                <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50" style={{ textWrap: "balance" }}>
                  Your answers will not be saved. All progress will be lost.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={handleConfirmCancel}
                    className="w-full rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
                  >
                    Yes, Cancel Exam
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-full px-6 py-2 text-sm font-medium text-gray-900/60 transition-all hover:text-gray-900 dark:text-white/60 dark:hover:text-white"
                  >
                    Continue Exam
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

  // Grading in progress
  if (grading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <p className="text-sm font-medium text-[#5227FF] dark:text-[#8B6FFF]">
            AI Is Grading Your Exam...
          </p>
        </motion.div>
        <Skeleton className="mx-auto h-2 w-48 rounded-full" />
      </div>
    );
  }

  let globalQ = 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Score banner */}
      {gradingResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className={`rounded-3xl p-8 text-center ${
            gradingResult.totalScore >= gradingResult.totalPossible * 0.9
              ? "bg-green-500/10 dark:bg-green-500/15"
              : gradingResult.totalScore >= gradingResult.totalPossible * 0.7
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-red-500/10 dark:bg-red-500/15"
          }`}
        >
          <span className="block font-display text-4xl font-light text-gray-900 dark:text-white">
            {gradingResult.totalScore} / {gradingResult.totalPossible}
          </span>
          <span className="mt-1 block text-sm text-gray-900/60 dark:text-white/60">
            {gradingResult.totalPossible > 0
              ? Math.round((gradingResult.totalScore / gradingResult.totalPossible) * 100)
              : 0}% Score
          </span>
          <span className="mt-1 block text-xs text-gray-900/40 dark:text-white/40">
            Completed In {formatTime(elapsed)}
          </span>
        </motion.div>
      )}

      {/* No grading result (grading failed) */}
      {!gradingResult && (
        <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <p className="text-sm text-gray-900/50 dark:text-white/50">
            Grading could not be completed. Please try again.
          </p>
        </div>
      )}

      {/* Review — all sections with results */}
      {gradingResult &&
        sections.map((section, si) => (
          <motion.div
            key={si}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease, delay: si * 0.05 }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                {section.title}
              </h3>
              <span className="rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#5227FF] dark:text-[#8B6FFF]">
                {section.points} pts
              </span>
              {/* Section score */}
              {(() => {
                const sectionResults = section.questions
                  .map((_, qi) => getResult(`s${si}-q${qi}`))
                  .filter(Boolean) as QuestionResult[];
                const earned = sectionResults.reduce((sum, r) => sum + r.pointsEarned, 0);
                return (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      earned >= section.points * 0.7
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {earned.toFixed(1)} / {section.points}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-3">
              {section.questions.map((q, qi) => {
                globalQ++;
                const key = `s${si}-q${qi}`;
                const qResult = getResult(key);

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border bg-white/50 p-5 backdrop-blur-xl dark:bg-white/10 ${
                      qResult
                        ? qResult.verdict === "correct"
                          ? "border-green-500/20"
                          : qResult.verdict === "partial"
                            ? "border-amber-500/20"
                            : "border-red-500/20"
                        : "border-gray-900/10 dark:border-white/15"
                    }`}
                  >
                    {qResult && (
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                            qResult.verdict === "correct"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : qResult.verdict === "partial"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {qResult.pointsEarned} / {qResult.pointsPossible} pts
                          {qResult.grading === "ai" ? " (AI)" : ""}
                        </span>
                      </div>
                    )}

                    {renderQuestion(
                      q,
                      si,
                      qi,
                      globalQ,
                      key,
                      answers,
                      () => {},
                      true,
                      qResult,
                    )}

                    {qResult?.feedback && (
                      <p
                        className={`mt-3 text-center text-xs ${
                          qResult.verdict === "correct"
                            ? "text-green-600 dark:text-green-400"
                            : qResult.verdict === "partial"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {qResult.feedback}
                      </p>
                    )}

                    {q.explanation && (
                      <p className="mt-2 text-center text-[11px] text-gray-900/50 dark:text-white/50">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

      {/* Retake */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleReset}
          className="rounded-full bg-gray-900/5 px-8 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          Retake Exam
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

// ─── Render individual question by type ────────────────────

function renderQuestion(
  q: MockExamContent["sections"][0]["questions"][0],
  si: number,
  qi: number,
  globalQ: number,
  key: string,
  answers: Record<string, string | number | number[]>,
  setAnswer: (key: string, value: string | number | number[]) => void,
  disabled: boolean,
  result?: QuestionResult,
) {
  switch (q.type) {
    case "multiple_choice":
      return (
        <MultipleChoice
          question={q.question}
          options={q.options ?? []}
          selectedIndex={answers[key] !== undefined ? Number(answers[key]) : null}
          correctIndex={result ? q.correctIndex : undefined}
          showResult={!!result}
          onSelect={(idx) => setAnswer(key, idx)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
        />
      );

    case "true_false":
      return (
        <TrueFalse
          question={q.question}
          selectedIndex={answers[key] !== undefined ? Number(answers[key]) : null}
          correctIndex={result ? q.correctIndex : undefined}
          showResult={!!result}
          onSelect={(idx) => setAnswer(key, idx)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
        />
      );

    case "short_answer":
      return (
        <ShortAnswer
          question={q.question}
          value={String(answers[key] ?? "")}
          onChange={(val) => setAnswer(key, val)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
          feedback={result?.feedback}
          verdict={result?.verdict}
        />
      );

    case "fill_in_blank":
      return (
        <FillInBlank
          question={q.question}
          value={String(answers[key] ?? "")}
          onChange={(val) => setAnswer(key, val)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
          feedback={result?.feedback}
          verdict={result?.verdict}
        />
      );

    case "matching":
      return (
        <Matching
          question={q.question}
          matchPairs={q.matchPairs ?? []}
          selectedOrder={
            Array.isArray(answers[key])
              ? (answers[key] as number[])
              : new Array(q.matchPairs?.length ?? 0).fill(-1)
          }
          correctMatchOrder={result ? q.correctMatchOrder : undefined}
          showResult={!!result}
          onSelect={(pairIdx, rightIdx) => {
            const current = Array.isArray(answers[key])
              ? [...(answers[key] as number[])]
              : new Array(q.matchPairs?.length ?? 0).fill(-1);
            current[pairIdx] = rightIdx;
            setAnswer(key, current);
          }}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
        />
      );

    case "essay":
      return (
        <Essay
          question={q.question}
          value={String(answers[key] ?? "")}
          onChange={(val) => setAnswer(key, val)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
          rubric={q.rubric}
          feedback={result?.feedback}
          verdict={result?.verdict}
        />
      );

    case "calculation":
      return (
        <Calculation
          question={q.question}
          value={String(answers[key] ?? "")}
          onChange={(val) => setAnswer(key, val)}
          disabled={disabled}
          points={q.points}
          questionNumber={globalQ}
          feedback={result?.feedback}
          verdict={result?.verdict}
        />
      );

    default:
      return (
        <p className="text-center text-sm text-gray-900/50 dark:text-white/50">
          Unknown Question Type: {q.type}
        </p>
      );
  }
}
