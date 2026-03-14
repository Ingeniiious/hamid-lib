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
const R2 = "https://lib.thevibecodedcompany.com/images";

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

type Scene = "browse" | "profile" | "rate" | "verified";

const PROFESSORS = [
  {
    name: "Dr. Anderson",
    dept: "Computer Science",
    avatar: `${R2}/male-teacher.webp`,
    rating: 4.7,
    reviews: 142,
    wouldTakeAgain: 94,
  },
  {
    name: "Prof. Martinez",
    dept: "Mathematics",
    avatar: `${R2}/female-teacher.webp`,
    rating: 4.3,
    reviews: 98,
    wouldTakeAgain: 87,
  },
  {
    name: "Dr. Kim",
    dept: "Engineering",
    avatar: `${R2}/ghost-teacher.webp`,
    rating: 3.9,
    reviews: 76,
    wouldTakeAgain: 72,
  },
  {
    name: "Prof. Taylor",
    dept: "Business",
    avatar: `${R2}/female-teacher.webp`,
    rating: 4.8,
    reviews: 203,
    wouldTakeAgain: 96,
  },
];

const TAGS = [
  "Clear Lectures",
  "Fair Grading",
  "Helpful",
  "Tough But Worth It",
  "Great Notes",
];

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
        src={`${R2}/back.webp`}
        alt="Back"
        className="h-[22px] w-auto object-contain opacity-60"
      />
    </div>
  );
}

/* ─── Rating color helper ─── */

function ratingColor(avg: number) {
  if (avg >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (avg >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-orange-600 dark:text-orange-400";
}

/* ─── Main component ─── */

export function RateProfessorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Refs */
  const profCardRef = useRef<HTMLDivElement>(null);
  const star4Ref = useRef<HTMLSpanElement>(null);
  const tag0Ref = useRef<HTMLSpanElement>(null);
  const tag2Ref = useRef<HTMLSpanElement>(null);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  /* State */
  const [scene, setScene] = useState<Scene>("browse");
  const [cycle, setCycle] = useState(0);
  const [highlightItem, setHighlightItem] = useState<string | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [typedReview, setTypedReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

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
      setScene("browse");
      setHighlightItem(null);
      setStarRating(0);
      setTypedReview("");
      setSelectedTags([]);

      if (!cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Browse professors ── */

      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(800);
      if (cancelled) return;

      // Click on Dr. Anderson
      await moveTo(profCardRef, 0.7);
      if (cancelled) return;
      setHighlightItem("anderson");
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 2: Professor profile ── */

      setHighlightItem(null);
      setScene("profile");
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.25 }
        );
      }
      await pause(4000);
      if (cancelled) return;

      /* ── SCENE 3: Rate — full cursor choreography ── */

      setScene("rate");
      await pause(1000);
      if (cancelled) return;

      // Show cursor
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.3 }
      );
      await pause(400);
      if (cancelled) return;

      // Move to 4th star, click, THEN stars fill
      await moveTo(star4Ref, 0.6);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      for (let s = 1; s <= 4; s++) {
        if (cancelled) return;
        setStarRating(s);
        await pause(80);
      }
      await pause(500);
      if (cancelled) return;

      // Move to "Clear Lectures" tag, click
      await moveTo(tag0Ref, 0.5);
      if (cancelled) return;
      await pause(200);
      await click();
      setSelectedTags([0]);
      if (cancelled) return;
      await pause(400);

      // Move to "Helpful" tag, click
      await moveTo(tag2Ref, 0.4);
      if (cancelled) return;
      await pause(200);
      await click();
      setSelectedTags([0, 2]);
      if (cancelled) return;
      await pause(500);

      // Move to text area, click to focus
      await moveTo(textAreaRef, 0.5);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      setHighlightItem("textarea");
      await pause(300);

      // Type review
      const review = "Great professor! Explains complex topics clearly and is always available for office hours.";
      for (let i = 0; i <= review.length; i++) {
        if (cancelled) return;
        setTypedReview(review.slice(0, i));
        await pause(25);
      }
      setHighlightItem(null);
      await pause(400);
      if (cancelled) return;

      // Move to submit, click
      setHighlightItem("submit");
      await moveTo(submitRef, 0.6);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(500);

      /* ── SCENE 4: Verified messaging ── */

      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3 }
        );
      }
      setScene("verified");
      setHighlightItem(null);
      await pause(5000);
      if (cancelled) return;

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
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Browse Professors ── */}
          {scene === "browse" && (
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Rate My Professor
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Choose wisely. Plan your semester.
                  </div>
                </div>

                {/* Professor card grid */}
                <div className="flex flex-1 items-start justify-center overflow-hidden px-5 pt-3">
                  <div className="grid w-full max-w-[300px] grid-cols-2 gap-2">
                    {PROFESSORS.map((prof, i) => (
                      <div
                        key={prof.name}
                        ref={i === 0 ? profCardRef : undefined}
                        className={`overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl transition-all duration-200 dark:bg-white/5 ${
                          highlightItem === "anderson" && i === 0
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-center pt-3">
                          <img
                            src={prof.avatar}
                            alt=""
                            className="h-[42px] w-[42px] object-contain"
                          />
                        </div>
                        <div className="px-2 pb-2.5 pt-1.5 text-center">
                          <div className="font-display text-[8px] font-light text-gray-900 dark:text-white">
                            {prof.name}
                          </div>
                          <div className="mt-0.5 text-[6px] text-gray-900/40 dark:text-white/40">
                            {prof.dept}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span
                              className={`text-[10px] font-semibold ${ratingColor(prof.rating)}`}
                            >
                              {prof.rating}
                            </span>
                            <span className="text-[5px] text-gray-900/30 dark:text-white/30">
                              ({prof.reviews})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 2: Professor Profile ── */}
          {scene === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center px-5">
                {/* Avatar + name */}
                <div className="pt-3 text-center">
                  <img
                    src={`${R2}/male-teacher.webp`}
                    alt=""
                    className="mx-auto h-[48px] w-[48px] rounded-full object-cover"
                  />
                  <div className="mt-2 font-display text-[12px] font-light text-gray-900 dark:text-white">
                    Dr. Anderson
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Computer Science
                  </div>
                </div>

                {/* Rating summary */}
                <div className="mt-3 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-[16px] font-semibold text-emerald-600 dark:text-emerald-400">
                      4.7
                    </div>
                    <div className="text-[6px] text-gray-900/40 dark:text-white/40">
                      Overall
                    </div>
                  </div>
                  <div className="h-[20px] w-px bg-gray-900/10 dark:bg-white/10" />
                  <div className="text-center">
                    <div className="text-[12px] font-medium text-gray-900 dark:text-white">
                      94%
                    </div>
                    <div className="text-[6px] text-gray-900/40 dark:text-white/40">
                      Would Take Again
                    </div>
                  </div>
                  <div className="h-[20px] w-px bg-gray-900/10 dark:bg-white/10" />
                  <div className="text-center">
                    <div className="text-[12px] font-medium text-gray-900 dark:text-white">
                      142
                    </div>
                    <div className="text-[6px] text-gray-900/40 dark:text-white/40">
                      Reviews
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1">
                  {["Clear Lectures", "Helpful", "Fair Grading"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#5227FF]/10 px-2 py-0.5 text-[6px] text-[#5227FF] dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Sample reviews */}
                <div className="mt-3 w-full space-y-1.5">
                  {[
                    {
                      text: "Best CS professor I've had. Makes data structures actually fun.",
                      stars: 5,
                    },
                    {
                      text: "Tough exams but fair. Office hours are really helpful.",
                      stars: 4,
                    },
                  ].map((rev, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-900/8 bg-white/40 px-3 py-2 text-center dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="text-[7px] text-yellow-500">
                        {"★".repeat(rev.stars)}
                        {"★"
                          .repeat(5 - rev.stars)
                          .split("")
                          .map((_, j) => (
                            <span
                              key={j}
                              className="text-gray-200 dark:text-gray-700"
                            >
                              ★
                            </span>
                          ))}
                      </div>
                      <div className="mt-0.5 text-[6px] leading-relaxed text-gray-900/60 dark:text-white/60">
                        {rev.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verified badge */}
                <div className="mt-2 flex items-center justify-center gap-1 text-[6px] text-emerald-600 dark:text-emerald-400">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified Student Reviews Only
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 3: Rate Professor ── */}
          {scene === "rate" && (
            <motion.div
              key="rate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center px-5">
                <div className="pt-2 text-center">
                  <div className="font-display text-[11px] font-light text-gray-900 dark:text-white">
                    Rate Dr. Anderson
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Computer Science
                  </div>
                </div>

                {/* Stars */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      ref={s === 4 ? star4Ref : undefined}
                      className={`text-[16px] transition-colors duration-150 ${
                        s <= starRating
                          ? "text-yellow-400"
                          : "text-gray-200 dark:text-gray-700"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1">
                  {TAGS.map((tag, i) => (
                    <span
                      key={tag}
                      ref={i === 0 ? tag0Ref : i === 2 ? tag2Ref : undefined}
                      className={`rounded-full border px-2 py-0.5 text-[6px] transition-all duration-200 ${
                        selectedTags.includes(i)
                          ? "border-[#5227FF]/40 bg-[#5227FF]/10 text-[#5227FF] dark:border-[#a78bfa]/30 dark:bg-[#a78bfa]/10 dark:text-[#a78bfa]"
                          : "border-gray-900/10 text-gray-900/40 dark:border-white/10 dark:text-white/40"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Review text area */}
                <div
                  ref={textAreaRef}
                  className={`mt-2.5 w-full flex-1 overflow-hidden rounded-xl border bg-white/40 px-3 py-2 transition-all duration-200 dark:bg-white/5 ${
                    highlightItem === "textarea"
                      ? "border-[#5227FF]/40 dark:border-[#5227FF]/40"
                      : "border-gray-900/8 dark:border-white/10"
                  }`}
                >
                  <div className="text-center text-[7px] leading-relaxed text-gray-900 dark:text-white">
                    {typedReview || (
                      <span className="text-gray-900/25 dark:text-white/25">
                        Share your experience...
                      </span>
                    )}
                    {typedReview && (
                      <span className="animate-pulse text-[#5227FF]">|</span>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-center pb-10 pt-2">
                  <div
                    ref={submitRef}
                    className={`rounded-full px-6 py-1.5 text-[7px] font-medium text-white transition-all duration-200 ${
                      highlightItem === "submit"
                        ? "bg-[#5227FF] shadow-md"
                        : "bg-[#5227FF]/80"
                    }`}
                  >
                    Submit Review
                  </div>
                </div>
              </div>
              <MiniBackButton />
            </motion.div>
          )}

          {/* ── Scene 4: Verified & Trusted messaging ── */}
          {scene === "verified" && (
            <motion.div
              key="verified"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
                {/* Avatars row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease }}
                  className="flex items-center justify-center gap-3"
                >
                  {[
                    `${R2}/male-teacher.webp`,
                    `${R2}/female-teacher.webp`,
                    `${R2}/ghost-teacher.webp`,
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-[36px] w-[36px] rounded-full object-cover"
                    />
                  ))}
                </motion.div>

                {/* Main message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6, ease }}
                  className="mt-4 text-center"
                >
                  <div className="font-display text-[15px] font-light text-gray-900 dark:text-white">
                    Verified Reviews Only
                  </div>
                  <div className="mt-1.5 text-[7px] leading-relaxed text-gray-900/50 dark:text-white/50">
                    Only students who actually attended the class can rate.
                    No fake reviews. No bias.
                  </div>
                </motion.div>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2, ease }}
                  className="mt-4 w-full max-w-[260px] space-y-1.5"
                >
                  {[
                    "Choose the right professor for you",
                    "Plan your semester with confidence",
                    "Drop or add classes based on real reviews",
                  ].map((text) => (
                    <div
                      key={text}
                      className="flex items-center justify-center gap-2 text-[7px] text-gray-900/60 dark:text-white/60"
                    >
                      <span className="text-[#5227FF]">✓</span>
                      {text}
                    </div>
                  ))}
                </motion.div>

                {/* Anonymous note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.8, ease }}
                  className="mt-4 text-center text-[6px] text-gray-900/30 dark:text-white/30"
                >
                  All reviews are anonymous and moderated
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
