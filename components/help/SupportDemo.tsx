"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;

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

type Scene = "form" | "submitted" | "tracking";

/* ─── Shared components ─── */

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

/* ─── Main component ─── */

export function SupportDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs */
  const subjectInputRef = useRef<HTMLDivElement>(null);
  const descInputRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLDivElement>(null);

  /* Scene state */
  const [scene, setScene] = useState<Scene>("form");
  const [cycle, setCycle] = useState(0);
  const [subjectText, setSubjectText] = useState("");
  const [descText, setDescText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    const typeText = async (
      text: string,
      setter: (v: string) => void,
      delayMs = 70
    ) => {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setter(text.slice(0, i));
        await pause(delayMs);
      }
    };

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setScene("form");
      setSubjectText("");
      setDescText("");
      setSubmitting(false);

      if (!cursorScope.current) return;

      // Position cursor center, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 140 },
        { duration: 0 }
      );
      await pause(500);
      if (cancelled) return;

      /* ── SCENE 1: Form — fill and submit ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      // 1. Move to subject input and type
      await moveTo(subjectInputRef, 0.7);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(200);
      await typeText("Can't access my course", setSubjectText, 55);
      if (cancelled) return;
      await pause(400);

      // 2. Move to description and type
      await moveTo(descInputRef, 0.6);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(200);
      await typeText(
        "I enrolled in Data Structures but the course page shows no content...",
        setDescText,
        35
      );
      if (cancelled) return;
      await pause(500);

      // 3. Move to submit button and click
      await moveTo(submitBtnRef, 0.6);
      if (cancelled) return;
      await click();
      if (cancelled) return;

      setSubmitting(true);
      await pause(1200);
      if (cancelled) return;

      /* ── SCENE 2: Submitted ── */
      // Fade cursor out
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      setScene("submitted");
      await pause(2500);
      if (cancelled) return;

      /* ── SCENE 3: Tracking ── */
      setScene("tracking");
      await pause(3000);
      if (cancelled) return;

      // Loop
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isInView, cycle, animateCursor, cursorScope]);

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
        {/* Persistent shared layout */}
        <DashboardGradient />
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Form scene ── */}
          {scene === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* PageHeader */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Support
                  </div>
                </div>

                {/* Form card */}
                <div className="flex items-start justify-center px-8 pt-3">
                  <div className="w-full max-w-[280px] rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                    {/* Subject input */}
                    <div>
                      <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                        Subject
                      </div>
                      <div
                        ref={subjectInputRef}
                        className="flex h-[22px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-3 dark:border-white/20 dark:bg-white/10"
                      >
                        <span
                          className={`text-[7px] ${
                            subjectText
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-900/40 dark:text-white/40"
                          }`}
                        >
                          {subjectText || "Subject"}
                        </span>
                        {subjectText && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="ml-px inline-block h-[8px] w-[1px] bg-gray-900 dark:bg-white"
                          />
                        )}
                      </div>
                    </div>

                    {/* Category + Priority row — side-by-side like real UI */}
                    <div className="mt-2.5 flex gap-2">
                      <div className="flex-1">
                        <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                          Category
                        </div>
                        <div className="flex h-[22px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 dark:border-white/20 dark:bg-white/10">
                          <span className="text-[7px] text-gray-900 dark:text-white">
                            Technical
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                          Priority
                        </div>
                        <div className="flex h-[22px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 dark:border-white/20 dark:bg-white/10">
                          <span className="text-[7px] text-gray-900 dark:text-white">
                            Medium
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message textarea */}
                    <div className="mt-2.5">
                      <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                        Message
                      </div>
                      <div
                        ref={descInputRef}
                        className="flex min-h-[48px] items-start justify-center rounded-xl border border-gray-900/15 bg-gray-900/5 px-3 py-2 dark:border-white/20 dark:bg-white/10"
                      >
                        <span
                          className={`text-center text-[7px] leading-relaxed ${
                            descText
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-900/40 dark:text-white/40"
                          }`}
                        >
                          {descText || "Describe your issue..."}
                        </span>
                        {descText && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="ml-px mt-px inline-block h-[8px] w-[1px] shrink-0 bg-gray-900 dark:bg-white"
                          />
                        )}
                      </div>
                    </div>

                    {/* Submit button */}
                    <div ref={submitBtnRef} className="mt-3">
                      <div
                        className={`flex h-[22px] items-center justify-center rounded-full text-[7px] font-medium text-white ${
                          submitting ? "bg-[#5227FF]/70" : "bg-[#5227FF]"
                        }`}
                      >
                        {submitting ? "Submitting..." : "Submit Ticket"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Submitted scene ── */}
          {scene === "submitted" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-10">
                {/* Green checkmark */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease, delay: 0.1 }}
                  className="mb-3 flex h-[40px] w-[40px] items-center justify-center rounded-full bg-emerald-500/15 dark:bg-emerald-400/15"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 10.5L8.5 14L15 7"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>

                <motion.div
                  className="w-full max-w-[250px] rounded-2xl border border-gray-900/10 bg-white/50 px-5 py-4 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease, delay: 0.25 }}
                >
                  <div className="font-display text-[12px] font-light text-gray-900 dark:text-white">
                    Ticket #1247 Created
                  </div>
                  <div className="mt-1 text-[7px] text-gray-900/50 dark:text-white/50">
                    We&apos;ll get back to you soon
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── Tracking scene ── */}
          {scene === "tracking" && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* PageHeader */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    My Tickets
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Track Your Support Requests
                  </div>
                </div>

                {/* Ticket list */}
                <div className="flex items-start justify-center px-8 pt-4">
                  <div className="w-full max-w-[280px] space-y-2">
                    {/* Ticket #1247 — Open */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, ease, delay: 0.15 }}
                      className="rounded-xl border border-gray-900/10 bg-white/50 px-4 py-3 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] font-medium text-gray-900/40 dark:text-white/40">
                          #1247
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[6px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Open
                        </span>
                      </div>
                      <div className="mt-1 text-center text-[8px] font-medium text-gray-900 dark:text-white">
                        Can&apos;t Access My Course
                      </div>
                      <div className="mt-0.5 text-center text-[6px] text-gray-900/40 dark:text-white/40">
                        Submitted just now
                      </div>
                    </motion.div>

                    {/* Ticket #1198 — Resolved */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, ease, delay: 0.35 }}
                      className="rounded-xl border border-gray-900/10 bg-white/50 px-4 py-3 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] font-medium text-gray-900/40 dark:text-white/40">
                          #1198
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[6px] font-medium text-emerald-600 dark:text-emerald-400">
                          Resolved
                        </span>
                      </div>
                      <div className="mt-1 text-center text-[8px] font-medium text-gray-900 dark:text-white">
                        Password Reset Issue
                      </div>
                      <div className="mt-0.5 text-center text-[6px] text-gray-900/40 dark:text-white/40">
                        3 days ago
                      </div>
                    </motion.div>
                  </div>
                </div>
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
