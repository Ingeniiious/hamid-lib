"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MultipleChoice } from "./question-types/MultipleChoice";
import { TrueFalse } from "./question-types/TrueFalse";
import { ShortAnswer } from "./question-types/ShortAnswer";
import { FillInBlank } from "./question-types/FillInBlank";
import { Matching } from "./question-types/Matching";
import { Essay } from "./question-types/Essay";
import { Calculation } from "./question-types/Calculation";
import { Skeleton } from "@/components/ui/skeleton";
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
  mode?: "preview" | "interactive";
}

export function MockExamRenderer({
  content,
  contentId,
  mode = "interactive",
}: MockExamRendererProps) {
  const sections = content.sections ?? [];

  // answers keyed by "s{sectionIdx}-q{questionIdx}"
  const [answers, setAnswers] = useState<
    Record<string, string | number | number[]>
  >({});
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(
    null,
  );
  const [grading, setGrading] = useState(false);

  // Build question count for enabling submit
  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + s.questions.length, 0),
    [sections],
  );

  const answeredCount = useMemo(() => {
    let count = 0;
    for (let si = 0; si < sections.length; si++) {
      for (let qi = 0; qi < sections[si].questions.length; qi++) {
        const key = `s${si}-q${qi}`;
        const val = answers[key];
        if (val !== undefined && val !== "" && val !== -1) {
          // For matching, check if any selections made
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

  const setAnswer = (key: string, value: string | number | number[]) => {
    if (gradingResult) return;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!contentId || grading) return;
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
        return;
      }

      const data = await res.json();
      setGradingResult({
        results: data.results,
        totalScore: data.totalScore,
        totalPossible: data.totalPossible,
      });
    } catch (e) {
      console.error("Grading error:", e);
    } finally {
      setGrading(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setGradingResult(null);
  };

  const getResult = (key: string): QuestionResult | undefined =>
    gradingResult?.results.find((r) => r.questionId === key);

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Sections In This Mock Exam
        </p>
      </div>
    );
  }

  // Global question number counter
  let globalQ = 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Exam header */}
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
          {content.title}
        </h2>
        {content.instructions && (
          <p className="mt-2 text-xs text-gray-900/50 dark:text-white/50">
            {content.instructions}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#5227FF]/10 px-3 py-1 text-[11px] font-medium text-[#5227FF] dark:text-[#8B6FFF]">
            {content.totalPoints} Points
          </span>
          {content.suggestedTimeMinutes > 0 && (
            <span className="rounded-full bg-gray-900/5 px-3 py-1 text-[11px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
              {content.suggestedTimeMinutes} Minutes
            </span>
          )}
          <span className="rounded-full bg-gray-900/5 px-3 py-1 text-[11px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
            {totalQuestions} Questions
          </span>
        </div>
      </div>

      {/* Score banner */}
      {gradingResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className={`rounded-2xl p-6 text-center ${
            gradingResult.totalScore >= gradingResult.totalPossible * 0.9
              ? "bg-green-500/10 dark:bg-green-500/15"
              : gradingResult.totalScore >= gradingResult.totalPossible * 0.7
                ? "bg-amber-500/10 dark:bg-amber-500/15"
                : "bg-red-500/10 dark:bg-red-500/15"
          }`}
        >
          <span className="block font-display text-3xl font-light text-gray-900 dark:text-white">
            {gradingResult.totalScore} / {gradingResult.totalPossible}
          </span>
          <span className="mt-1 block text-sm text-gray-900/60 dark:text-white/60">
            {gradingResult.totalPossible > 0
              ? Math.round(
                  (gradingResult.totalScore / gradingResult.totalPossible) * 100,
                )
              : 0}
            % Score
          </span>
        </motion.div>
      )}

      {/* Grading spinner */}
      {grading && (
        <div className="space-y-3 rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
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
      )}

      {/* Sections */}
      {sections.map((section, si) => (
        <motion.div
          key={si}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: si * 0.05 }}
        >
          {/* Section header */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
              {section.title}
            </h3>
            <span className="rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#5227FF] dark:text-[#8B6FFF]">
              {section.points} pts
            </span>
            {gradingResult && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  (() => {
                    const sectionResults = section.questions
                      .map((_, qi) => getResult(`s${si}-q${qi}`))
                      .filter(Boolean) as QuestionResult[];
                    const earned = sectionResults.reduce(
                      (sum, r) => sum + r.pointsEarned,
                      0,
                    );
                    return earned >= section.points * 0.7
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                  })()
                }`}
              >
                {(() => {
                  const sectionResults = section.questions
                    .map((_, qi) => getResult(`s${si}-q${qi}`))
                    .filter(Boolean) as QuestionResult[];
                  return sectionResults
                    .reduce((sum, r) => sum + r.pointsEarned, 0)
                    .toFixed(1);
                })()}{" "}
                / {section.points}
              </span>
            )}
          </div>

          {/* Questions in this section */}
          <div className="space-y-3">
            {section.questions.map((q, qi) => {
              globalQ++;
              const key = `s${si}-q${qi}`;
              const qResult = getResult(key);
              const isDisabled =
                !!gradingResult || grading || mode === "preview";

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
                  {/* Points earned badge */}
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
                    setAnswer,
                    isDisabled,
                    qResult,
                  )}

                  {/* AI feedback */}
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

                  {/* Show explanation after grading */}
                  {gradingResult && q.explanation && (
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

      {/* Submit / Reset */}
      {mode === "interactive" && contentId && (
        <div className="flex items-center justify-center gap-3">
          {!gradingResult ? (
            <button
              onClick={handleSubmit}
              disabled={answeredCount === 0 || grading}
              className="rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              {grading ? "Grading..." : "Submit Exam"}
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="rounded-full bg-gray-900/5 px-8 py-2.5 text-sm font-medium text-gray-900/70 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              Retake Exam
            </button>
          )}
          {!gradingResult && (
            <span className="text-[11px] text-gray-900/40 dark:text-white/40">
              {answeredCount} / {totalQuestions} Answered
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render individual question by type
// ---------------------------------------------------------------------------

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
          selectedIndex={
            answers[key] !== undefined ? Number(answers[key]) : null
          }
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
          selectedIndex={
            answers[key] !== undefined ? Number(answers[key]) : null
          }
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
