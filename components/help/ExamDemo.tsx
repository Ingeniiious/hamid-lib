"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useAnimate,
} from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;
const R2 = "https://lib.thevibecodedcompany.com";

/* ─── Helpers ─── */

function getElPos(
  el: HTMLElement | null,
  container: HTMLElement | null
): { x: number; y: number } {
  if (!el || !container) return { x: 0, y: 0 };
  let x = el.offsetLeft + el.offsetWidth / 2;
  let y = el.offsetTop + el.offsetHeight / 2;
  let parent = el.offsetParent as HTMLElement | null;
  while (parent && parent !== container) {
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

type Scene = "mcq" | "essay" | "math" | "results" | "unique";

/* ─── Shared layout ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

function MiniTopBar() {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-900/20 bg-gray-900/10 text-[7px] font-medium text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
          S
        </div>
        <span className="font-display text-[8px] font-light text-gray-900 dark:text-white">
          Hello Sarah
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[14px] w-[14px] rounded-full border border-gray-900/15 dark:border-white/15" />
        <div className="h-[14px] w-[14px] rounded-full border border-gray-900/15 dark:border-white/15" />
      </div>
    </div>
  );
}

function MiniBackButton() {
  return (
    <div className="absolute bottom-3 left-3 z-20">
      <img
        src={`${R2}/images/back.webp`}
        alt="Back"
        className="h-[22px] w-auto object-contain opacity-60"
      />
    </div>
  );
}

/* ─── Shared question header ─── */

function QuestionHeader({
  course,
  faculty,
  label,
  progress,
}: {
  course: string;
  faculty: string;
  label: string;
  progress: number;
}) {
  return (
    <div className="pt-2 text-center">
      <div className="font-display text-[10px] font-light text-gray-900 dark:text-white">
        {course}
      </div>
      <div className="mt-0.5 text-[6px] text-gray-900/30 dark:text-white/30">
        {faculty}
      </div>
      <div className="mt-2 text-[7px] text-gray-900/40 dark:text-white/40">
        {label}
      </div>
      <div className="mx-auto mt-1.5 h-[3px] w-3/4 overflow-hidden rounded-full bg-gray-900/8 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-[#5227FF]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Answer option ─── */

function AnswerOption({
  label,
  text,
  state,
  innerRef,
}: {
  label: string;
  text: string;
  state: "default" | "hover" | "selected" | "correct";
  innerRef?: RefObject<HTMLDivElement | null>;
}) {
  const border = {
    default:
      "border-gray-900/8 bg-white/40 dark:border-white/10 dark:bg-white/5",
    hover:
      "border-[#5227FF]/30 bg-white/40 dark:border-[#5227FF]/30 dark:bg-white/5",
    selected:
      "border-[#5227FF]/40 bg-[#5227FF]/5 dark:bg-[#5227FF]/10",
    correct:
      "border-emerald-500/40 bg-emerald-50/60 dark:border-emerald-400/40 dark:bg-emerald-900/20",
  }[state];

  const circle = {
    default:
      "border-gray-900/20 text-gray-900/60 dark:border-white/20 dark:text-white/60",
    hover:
      "border-[#5227FF]/40 text-gray-900/60 dark:border-[#5227FF]/40 dark:text-white/60",
    selected: "border-[#5227FF] bg-[#5227FF] text-white",
    correct: "border-emerald-500 bg-emerald-500 text-white",
  }[state];

  return (
    <div
      ref={innerRef}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${border}`}
    >
      <div
        className={`flex h-[14px] w-[14px] items-center justify-center rounded-full border text-[6px] font-medium ${circle}`}
      >
        {state === "correct" ? "✓" : label}
      </div>
      <span className="text-[8px] text-gray-900 dark:text-white">{text}</span>
    </div>
  );
}

/* ─── Main component ─── */

export function ExamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Refs for cursor targets */
  const mcqAnswerRef = useRef<HTMLDivElement>(null);
  const mathAnswerRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  /* State */
  const [scene, setScene] = useState<Scene>("mcq");
  const [cycle, setCycle] = useState(0);
  const [highlightItem, setHighlightItem] = useState<string | null>(null);
  const [mcqSelected, setMcqSelected] = useState(-1);
  const [mcqCorrect, setMcqCorrect] = useState(false);
  const [mathSelected, setMathSelected] = useState(-1);
  const [mathCorrect, setMathCorrect] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [aiReviewing, setAiReviewing] = useState(false);

  /* ─── Animation sequence ─── */

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const pause = (ms: number) =>
      new Promise<void>((res) => {
        setTimeout(res, ms);
      });

    const click = async () => {
      if (cancelled || !cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { scale: 0.78 },
        { duration: 0.09 }
      );
      await animateCursor(
        cursorScope.current,
        { scale: 1 },
        { duration: 0.18, ease: easeSoft }
      );
    };

    const moveTo = async (
      ref: RefObject<HTMLElement | null>,
      duration = 0.8
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const pos = getElPos(ref.current, containerRef.current);
      await animateCursor(
        cursorScope.current,
        { x: pos.x, y: pos.y },
        { duration, ease: easeSoft }
      );
    };

    const run = async () => {
      /* ── Reset ── */
      setScene("mcq");
      setHighlightItem(null);
      setMcqSelected(-1);
      setMcqCorrect(false);
      setMathSelected(-1);
      setMathCorrect(false);
      setTypedText("");
      setAiReviewing(false);

      if (!cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Multiple Choice — Computer Science ── */

      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(800);
      if (cancelled) return;

      // Move to answer B (correct)
      await moveTo(mcqAnswerRef, 0.7);
      if (cancelled) return;
      setHighlightItem("mcqB");
      await pause(300);
      await click();
      setMcqSelected(1);
      if (cancelled) return;
      await pause(500);
      setMcqCorrect(true);
      await pause(1800);
      if (cancelled) return;

      /* ── SCENE 2: Essay — Philosophy ── */

      // Fade cursor out for transition
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.25 }
        );
      }
      setScene("essay");
      setHighlightItem(null);
      await pause(1000);
      if (cancelled) return;

      // Type essay
      const essay =
        "The ethical implications of AI in healthcare are profound. While AI can improve diagnostic accuracy and reduce human error, it raises concerns about patient privacy, algorithmic bias, and the erosion of the doctor-patient relationship...";
      for (let i = 0; i <= essay.length; i++) {
        if (cancelled) return;
        setTypedText(essay.slice(0, i));
        await pause(22);
      }
      await pause(400);
      if (cancelled) return;

      // Show cursor, click submit
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.3 }
      );
      setHighlightItem("submit");
      await moveTo(submitRef, 0.6);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;
      setAiReviewing(true);
      await pause(2000);
      if (cancelled) return;

      /* ── SCENE 3: Math — Engineering ── */

      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.25 }
        );
      }
      setScene("math");
      setHighlightItem(null);
      setAiReviewing(false);
      await pause(1000);
      if (cancelled) return;

      // Show cursor, select answer
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.3 }
      );
      await pause(600);
      if (cancelled) return;

      await moveTo(mathAnswerRef, 0.7);
      if (cancelled) return;
      setHighlightItem("mathA");
      await pause(300);
      await click();
      setMathSelected(0);
      if (cancelled) return;
      await pause(500);
      setMathCorrect(true);
      await pause(1800);
      if (cancelled) return;

      /* ── SCENE 4: Results — messaging ── */

      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3 }
        );
      }
      setScene("results");
      await pause(4000);
      if (cancelled) return;

      /* ── SCENE 5: Unique exams ── */

      setScene("unique");
      await pause(5000);
      if (cancelled) return;

      if (!cancelled) setCycle((c) => c + 1);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isInView, cycle, animateCursor, cursorScope]);

  /* ─── Answer state helpers ─── */

  const mcqState = (idx: number) => {
    if (mcqCorrect && idx === 1) return "correct" as const;
    if (mcqSelected === idx) return "selected" as const;
    if (highlightItem === "mcqB" && idx === 1) return "hover" as const;
    return "default" as const;
  };

  const mathState = (idx: number) => {
    if (mathCorrect && idx === 0) return "correct" as const;
    if (mathSelected === idx) return "selected" as const;
    if (highlightItem === "mathA" && idx === 0) return "hover" as const;
    return "default" as const;
  };

  /* ─── Render ─── */

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl shadow-black/10"
    >
      {/* Grainient background */}
      <div className="absolute inset-0">
        <Grainient
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
          grainAmount={0.08}
          timeSpeed={0.15}
          contrast={1.3}
          className="h-full w-full"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 dark:bg-black/50" />

      {/* Window chrome */}
      <div className="relative z-10 flex items-center gap-1.5 px-3.5 py-2">
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-[330px]">
        <DashboardGradient />
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Multiple Choice — Computer Science ── */}
          {scene === "mcq" && (
            <motion.div
              key="mcq"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col px-5">
                <QuestionHeader
                  course="Data Structures"
                  faculty="Computer Science"
                  label="Question 3 of 20"
                  progress={15}
                />
                <div className="mt-3 text-center font-display text-[10px] font-light text-gray-900 dark:text-white">
                  Which data structure uses FIFO ordering?
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    { l: "A", t: "Stack" },
                    { l: "B", t: "Queue" },
                    { l: "C", t: "Tree" },
                    { l: "D", t: "Graph" },
                  ].map((a, i) => (
                    <AnswerOption
                      key={a.l}
                      label={a.l}
                      text={a.t}
                      state={mcqState(i)}
                      innerRef={i === 1 ? mcqAnswerRef : undefined}
                    />
                  ))}
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 2: Essay — Philosophy ── */}
          {scene === "essay" && (
            <motion.div
              key="essay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col px-5">
                <QuestionHeader
                  course="Introduction to Philosophy"
                  faculty="Humanities"
                  label="Essay Question 1 of 3"
                  progress={33}
                />
                <div className="mt-3 text-center font-display text-[9px] font-light text-gray-900 dark:text-white">
                  Discuss the ethical implications of artificial intelligence in
                  healthcare.
                </div>
                <div className="mt-2 flex-1 overflow-hidden rounded-xl border border-gray-900/8 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="text-center text-[7px] leading-relaxed text-gray-900 dark:text-white">
                    {typedText}
                    <span className="animate-pulse text-[#5227FF]">|</span>
                  </div>
                </div>
                <div className="flex justify-center pb-10 pt-2">
                  <motion.div
                    ref={submitRef}
                    layout
                    transition={{ layout: { duration: 0.3, ease } }}
                    className={`rounded-full px-6 py-1.5 text-center text-[7px] font-medium text-white ${
                      highlightItem === "submit"
                        ? "bg-[#5227FF] shadow-md"
                        : "bg-[#5227FF]/80"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {aiReviewing ? (
                        <motion.span
                          key="reviewing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="inline-block h-[8px] w-[8px] rounded-full border border-white/30 border-t-white"
                          />
                          Teachers Reviewing...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="submit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          Submit To Your Teachers
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 3: Math — Engineering ── */}
          {scene === "math" && (
            <motion.div
              key="math"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col px-5">
                <QuestionHeader
                  course="Calculus I"
                  faculty="Engineering"
                  label="Question 8 of 15"
                  progress={53}
                />
                <div className="mt-3 text-center font-display text-[10px] font-light text-gray-900 dark:text-white">
                  Find the derivative of f(x) = 3x² + 2x − 5
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    { l: "A", t: "f'(x) = 6x + 2" },
                    { l: "B", t: "f'(x) = 3x + 2" },
                    { l: "C", t: "f'(x) = 6x² + 2" },
                    { l: "D", t: "f'(x) = 3x² + 2x" },
                  ].map((a, i) => (
                    <AnswerOption
                      key={a.l}
                      label={a.l}
                      text={a.t}
                      state={mathState(i)}
                      innerRef={i === 0 ? mathAnswerRef : undefined}
                    />
                  ))}
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 4: Results + Messaging ── */}
          {scene === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-5">
                {/* Score */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease }}
                  className="text-center"
                >
                  <div className="font-display text-[32px] font-light text-[#5227FF]">
                    85
                  </div>
                  <div className="text-[9px] text-gray-900/40 dark:text-white/40">
                    out of 100
                  </div>
                </motion.div>

                {/* Breakdown */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6, ease }}
                  className="mt-4 w-full max-w-[240px] space-y-1.5"
                >
                  {[
                    { label: "Multiple Choice", score: "17/20", pct: 85 },
                    { label: "Essay", score: "34/40", pct: 85 },
                    { label: "Math", score: "34/40", pct: 85 },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-center gap-3 text-[7px]"
                    >
                      <span className="w-[70px] text-center text-gray-900/60 dark:text-white/60">
                        {row.label}
                      </span>
                      <div className="h-[3px] w-[50px] overflow-hidden rounded-full bg-gray-900/8 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#5227FF]"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-[30px] text-center font-medium text-gray-900 dark:text-white">
                        {row.score}
                      </span>
                    </div>
                  ))}
                </motion.div>

                {/* Messaging */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2, ease }}
                  className="mt-5 text-center"
                >
                  <div className="font-display text-[11px] font-light text-gray-900 dark:text-white">
                    Results In Minutes
                  </div>
                  <div className="mt-1 text-[7px] text-gray-900/40 dark:text-white/40">
                    Your teachers grade your work and track your improvement
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 5: Unique Exams ── */}
          {scene === "unique" && (
            <motion.div
              key="unique"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
                {/* Title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease }}
                  className="text-center"
                >
                  <div className="font-display text-[18px] font-light text-gray-900 dark:text-white">
                    5 Unique Mock Exams
                  </div>
                  <div className="mt-1 text-[8px] text-gray-900/40 dark:text-white/40">
                    Every Course, Always Fresh
                  </div>
                </motion.div>

                {/* 5 exam cards */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7, ease }}
                  className="mt-5 flex items-center justify-center gap-2"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`flex h-[36px] w-[36px] items-center justify-center rounded-lg border text-[8px] font-medium ${
                        n <= 3
                          ? "border-[#5227FF]/30 bg-[#5227FF]/10 text-[#5227FF] dark:border-[#a78bfa]/30 dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]"
                          : "border-gray-900/10 bg-white/40 text-gray-900/30 dark:border-white/10 dark:bg-white/5 dark:text-white/30"
                      }`}
                    >
                      {n <= 3 ? "✓" : `v${n}`}
                    </div>
                  ))}
                </motion.div>

                {/* Bottom messaging */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.3, ease }}
                  className="mt-5 text-center"
                >
                  <div className="text-[8px] text-gray-900/50 dark:text-white/50">
                    Done all 5? No problem.
                  </div>
                  <div className="mt-2 inline-block rounded-full bg-[#5227FF] px-5 py-1.5 text-[7px] font-medium text-white">
                    Request A New Exam
                  </div>
                  <div className="mt-2 text-[6px] text-gray-900/30 dark:text-white/30">
                    Your teachers create a brand new unique exam just for you
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mouse cursor ── */}
      <div
        ref={cursorScope}
        className="pointer-events-none absolute left-0 top-0 z-30"
        style={{
          opacity: 0,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
        }}
      >
        <svg
          width="16"
          height="20"
          viewBox="0 0 16 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.5 1L1.5 15.5L5.5 11.5L9 18.5L11 17.5L7.5 11L13.5 11L1.5 1Z"
            fill="white"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
