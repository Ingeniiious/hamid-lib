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

type Scene = "input" | "waiting" | "viewer";

/* ─── Watermark overlay (matches real FileViewer) ─── */

function WatermarkOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-x-16 gap-y-10"
        style={{ transform: "rotate(-30deg)" }}
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-display text-[8px] font-light tracking-wider"
            style={{ color: "rgba(0,0,0,0.06)" }}
          >
            libraryyy.com
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── OTP character box ─── */

function OTPBox({
  char,
  isActive,
}: {
  char: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex h-[26px] w-[26px] items-center justify-center border-y border-r text-[10px] font-semibold uppercase text-white transition-colors duration-150 first:rounded-l-md first:border-l last:rounded-r-md ${
        char
          ? "border-white/40 bg-white/15"
          : isActive
            ? "border-white/40 bg-white/15"
            : "border-white/20 bg-white/10"
      }`}
    >
      {char && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
        >
          {char}
        </motion.span>
      )}
      {!char && isActive && (
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.7 }}
          className="h-[10px] w-[1px] bg-white/60"
        />
      )}
    </div>
  );
}

/* ─── Main component ─── */

export function PortalDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs */
  const firstSlotRef = useRef<HTMLDivElement>(null);

  /* Scene state */
  const [scene, setScene] = useState<Scene>("input");
  const [cycle, setCycle] = useState(0);

  /* OTP state: 8 characters, split as XXXX-XXXX */
  const CODE = "XR4K9MWT";
  const [typedChars, setTypedChars] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [activeSlot, setActiveSlot] = useState(-1);

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
      await pause(400);
      if (cancelled) return;

      setScene("input");
      setTypedChars(["", "", "", "", "", "", "", ""]);
      setActiveSlot(-1);

      if (!cursorScope.current) return;

      // Hide cursor, position roughly center
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 200 },
        { duration: 0 }
      );
      await pause(700);
      if (cancelled) return;

      /* ── SCENE 1: INPUT ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(500);
      if (cancelled) return;

      // Move to first OTP slot
      await moveTo(firstSlotRef, 0.9);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(300);

      // Type code characters one by one
      for (let i = 0; i < CODE.length; i++) {
        if (cancelled) return;
        setActiveSlot(i);
        await pause(80);

        setTypedChars((prev) => {
          const next = [...prev];
          next[i] = CODE[i];
          return next;
        });
        await pause(140);
      }
      if (cancelled) return;
      setActiveSlot(-1);
      await pause(600);

      // Hide cursor
      if (cursorScope.current) {
        await animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      /* ── SCENE 2: WAITING ── */
      setScene("waiting");
      await pause(3000);
      if (cancelled) return;

      /* ── SCENE 3: VIEWER ── */
      setScene("viewer");
      await pause(4000);
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
        <AnimatePresence mode="wait">
          {/* ── Scene 1: Portal code input ── */}
          {scene === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8"
            >
              {/* Portal illustration — small version */}
              <motion.img
                src="https://lib.thevibecodedcompany.com/images/portal-new.webp"
                alt=""
                className="mb-3 h-[80px] w-[80px] object-contain"
                draggable={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.1 }}
              />

              {/* Card */}
              <motion.div
                className="w-full max-w-[300px] rounded-3xl border border-white/20 bg-white/10 px-5 py-5 shadow-2xl backdrop-blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.15 }}
              >
                {/* Title */}
                <div className="text-center font-display text-[16px] font-light text-white">
                  Portal
                </div>

                {/* Subtitle */}
                <div className="mt-1 text-center text-[8px] text-white/50">
                  Enter The Code Shared By Your Presenter
                </div>

                {/* OTP-style input: XXXX-XXXX */}
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {/* First 4 boxes */}
                  <div className="flex items-center">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        ref={i === 0 ? firstSlotRef : undefined}
                      >
                        <OTPBox
                          char={typedChars[i]}
                          isActive={activeSlot === i}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Dash separator */}
                  <span className="text-[12px] font-light text-white/30">
                    -
                  </span>

                  {/* Last 4 boxes */}
                  <div className="flex items-center">
                    {[4, 5, 6, 7].map((i) => (
                      <div key={i}>
                        <OTPBox
                          char={typedChars[i]}
                          isActive={activeSlot === i}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Scene 2: Waiting for approval ── */}
          {scene === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8"
            >
              <motion.div
                className="w-full max-w-[300px] rounded-3xl border border-white/20 bg-white/10 px-5 py-6 shadow-2xl backdrop-blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.1 }}
              >
                {/* Spinner */}
                <motion.div
                  className="mx-auto h-[24px] w-[24px] rounded-full border-2 border-amber-400/30 border-t-amber-400/80"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear",
                  }}
                />

                {/* Title — pulsing */}
                <motion.div
                  className="mt-3 text-center text-[11px] font-medium text-amber-400/90"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                >
                  Waiting For Approval
                </motion.div>

                {/* Subtitle */}
                <div className="mt-1.5 text-center text-[7px] leading-relaxed text-white/40">
                  The presenter will approve your access shortly
                </div>

                {/* File name */}
                <div className="mt-3 text-center text-[7px] text-white/30">
                  Recursion Slides
                </div>

                {/* Pulsing dots */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-[4px] w-[4px] rounded-full bg-amber-400/50"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: i * 0.3,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Scene 3: File viewer ── */}
          {scene === "viewer" && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-0 flex flex-col px-5 pt-1"
            >
              {/* Header — file name + fullscreen toggle */}
              <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.1 }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-medium text-white/80">
                    Recursion Slides
                  </div>
                  <div className="text-[6px] text-white/30">5.1 MB</div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[6px] font-medium text-white/70">
                  {/* Fullscreen icon */}
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Fullscreen
                </div>
              </motion.div>

              {/* Slide preview area */}
              <motion.div
                className="relative mt-2 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white dark:border-white/10 dark:bg-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.2 }}
              >
                {/* Slide content skeleton */}
                <div className="flex h-full flex-col items-center justify-center p-6">
                  {/* Slide title skeleton */}
                  <div className="mb-3 h-[7px] w-[55%] rounded-full bg-gray-900/10 dark:bg-white/10" />

                  {/* Content lines */}
                  <div className="mb-1.5 h-[4px] w-[75%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[65%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[70%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[60%] rounded-full bg-gray-900/5 dark:bg-white/5" />

                  {/* Code/diagram block */}
                  <div className="mt-3 h-[28px] w-[45%] rounded bg-[#5227FF]/8 dark:bg-[#5227FF]/15" />

                  {/* More lines */}
                  <div className="mt-3 mb-1.5 h-[4px] w-[68%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[72%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                </div>

                {/* Watermark overlay */}
                <WatermarkOverlay />
              </motion.div>

              {/* Slide counter */}
              <motion.div
                className="py-2 text-center text-[6px] text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.35 }}
              >
                Slide 1 Of 24
              </motion.div>
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
