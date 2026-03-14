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

type Scene = "content" | "challenge" | "result";

/* ─── Shared gradient overlay ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

/* ─── Main component ─── */

export function ChallengeContentDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const errorTextRef = useRef<HTMLDivElement>(null);
  const challengeBtnRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLDivElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("content");
  const [cycle, setCycle] = useState(0);
  const [showChallengeBtn, setShowChallengeBtn] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengeMessage = "Sorting can be done in-place with O(1) extra space";

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

    const typeText = async (text: string, delayPerChar = 40) => {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setTypedText(text.slice(0, i));
        await pause(delayPerChar);
      }
    };

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setScene("content");
      setShowChallengeBtn(false);
      setTypedText("");
      setIsSubmitting(false);

      if (!cursorScope.current) return;

      // Position cursor center, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Content — click error text, then Challenge button ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(500);
      if (cancelled) return;

      // Move to the error text
      await moveTo(errorTextRef, 0.8);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;

      // Show challenge button
      setShowChallengeBtn(true);
      await pause(600);
      if (cancelled) return;

      // Move to challenge button and click
      await moveTo(challengeBtnRef, 0.6);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 2: Challenge form — type and submit ── */
      setScene("challenge");
      await pause(800);
      if (cancelled) return;

      // Move cursor to text input area (we'll use submitBtn area minus offset)
      const inputPos = containerRef.current
        ? { x: 210, y: 210 }
        : { x: 210, y: 210 };
      await animateCursor(
        cursorScope.current,
        { x: inputPos.x, y: inputPos.y },
        { duration: 0.6, ease: easeSoft }
      );
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(300);

      // Type the challenge message
      await typeText(challengeMessage, 35);
      if (cancelled) return;
      await pause(400);

      // Move to submit button and click
      await moveTo(submitBtnRef, 0.6);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;

      // Show loading state
      setIsSubmitting(true);
      await pause(1000);
      if (cancelled) return;

      /* ── SCENE 3: Result — council verdict ── */
      setIsSubmitting(false);
      setScene("result");
      await pause(3500);
      if (cancelled) return;

      // Fade cursor out
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }
      await pause(2500);

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
        <DashboardGradient />

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Study Guide Content ── */}
          {scene === "content" && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="relative z-10 flex h-full flex-col px-5 pt-3">
                {/* Study guide header */}
                <div className="text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Study Guide — Arrays
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Data Structures — Chapter 2
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-auto mt-2.5 h-px w-12 bg-gray-900/10 dark:bg-white/10" />

                {/* Content paragraphs */}
                <div className="mt-3 space-y-3 px-2">
                  <div className="text-center text-[8px] leading-relaxed text-gray-900/70 dark:text-white/70">
                    Arrays store elements in contiguous memory locations, allowing constant-time access via index.
                  </div>

                  <div className="text-center text-[8px] leading-relaxed text-gray-900/70 dark:text-white/70">
                    Each element occupies a fixed-size slot, making arrays highly cache-friendly for sequential reads.
                  </div>

                  {/* Paragraph with error */}
                  <div className="relative text-center text-[8px] leading-relaxed text-gray-900/70 dark:text-white/70">
                    Common operations include traversal, insertion, and deletion.{" "}
                    <span
                      ref={errorTextRef}
                      className="inline cursor-pointer border-b border-dashed border-orange-400/60 bg-orange-400/10 px-0.5 text-orange-600 dark:border-orange-300/60 dark:bg-orange-400/5 dark:text-orange-300"
                    >
                      Arrays always use O(n) space for sorting
                    </span>
                    {" "}due to auxiliary data requirements.
                  </div>

                  {/* Challenge button (appears on click) */}
                  <AnimatePresence>
                    {showChallengeBtn && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-center"
                      >
                        <div
                          ref={challengeBtnRef}
                          className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[7px] font-medium text-orange-600 dark:border-orange-300/30 dark:bg-orange-400/5 dark:text-orange-300"
                        >
                          Challenge
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-center text-[8px] leading-relaxed text-gray-900/70 dark:text-white/70">
                    Understanding time and space complexity is essential for choosing the right data structure.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 2: Challenge Form ── */}
          {scene === "challenge" && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="relative z-10 flex h-full flex-col px-5 pt-3">
                {/* Header */}
                <div className="text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Challenge Content
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Flag An Error For AI Council Review
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-auto mt-2.5 h-px w-12 bg-gray-900/10 dark:bg-white/10" />

                {/* Quoted flagged text */}
                <div className="mx-auto mt-4 w-full max-w-[280px] rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-2 dark:border-orange-300/20 dark:bg-orange-400/5">
                  <div className="text-center text-[6px] font-medium uppercase tracking-wider text-orange-500/60 dark:text-orange-300/60">
                    Flagged Text
                  </div>
                  <div className="mt-1 text-center text-[8px] leading-relaxed text-orange-600 dark:text-orange-300">
                    &ldquo;Arrays always use O(n) space for sorting&rdquo;
                  </div>
                </div>

                {/* Text input */}
                <div className="mx-auto mt-3 w-full max-w-[280px]">
                  <div className="mb-1 text-center text-[7px] text-gray-900/50 dark:text-white/50">
                    Your Correction
                  </div>
                  <div className="min-h-[36px] rounded-xl border border-gray-900/10 bg-white/60 px-3 py-2 text-center text-[8px] leading-relaxed text-gray-900 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {typedText}
                    {typedText.length < challengeMessage.length && (
                      <span className="inline-block h-[10px] w-px animate-pulse bg-gray-900/50 dark:bg-white/50" />
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="mx-auto mt-3">
                  <div
                    ref={submitBtnRef}
                    className={`rounded-full px-5 py-1.5 text-center text-[8px] font-medium text-white transition-all duration-200 ${
                      isSubmitting
                        ? "bg-[#5227FF]/60"
                        : "bg-[#5227FF] hover:opacity-90"
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="inline-block h-[6px] w-[6px] animate-spin rounded-full border border-white/30 border-t-white" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Challenge"
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 3: Council Result ── */}
          {scene === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="relative z-10 flex h-full flex-col px-5 pt-3">
                {/* Header */}
                <div className="text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Challenge Reviewed
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    The AI Teaching Council Has Responded
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-auto mt-2.5 h-px w-12 bg-gray-900/10 dark:bg-white/10" />

                {/* Verdict card */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3, ease }}
                  className="mx-auto mt-4 w-full max-w-[280px] rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5 dark:border-emerald-300/20 dark:bg-emerald-400/5"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Green checkmark */}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      className="text-emerald-500 dark:text-emerald-400"
                    >
                      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" />
                      <path
                        d="M3.5 6L5.5 8L8.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Correction Accepted
                    </span>
                  </div>
                </motion.div>

                {/* Explanation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6, ease }}
                  className="mt-3 text-center text-[7px] leading-relaxed text-gray-900/60 dark:text-white/60"
                >
                  The teaching council has verified your correction and updated the content.
                </motion.div>

                {/* Corrected text */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.9, ease }}
                  className="mx-auto mt-3 w-full max-w-[280px] rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 dark:border-emerald-300/20 dark:bg-emerald-400/5"
                >
                  <div className="text-center text-[6px] font-medium uppercase tracking-wider text-emerald-500/60 dark:text-emerald-400/60">
                    Updated Content
                  </div>
                  <div className="mt-1 text-center text-[8px] leading-relaxed text-emerald-600 dark:text-emerald-300">
                    &ldquo;Arrays can be sorted in-place using O(1) extra space&rdquo;
                  </div>
                </motion.div>

                {/* Thank you */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2, ease }}
                  className="mt-3 text-center text-[6px] text-gray-900/35 dark:text-white/35"
                >
                  Thank you for helping improve Libraryyy
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
        style={{ opacity: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
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
