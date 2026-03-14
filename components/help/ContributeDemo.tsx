"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;
const appleEase = [0.22, 1, 0.36, 1] as const; // slow-fast-slow ramp
const R2 = "https://lib.thevibecodedcompany.com";
const CHROME_H = 21; // window chrome height in px
const VIEWPORT_H = 330; // visible content area height

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

type Scene = "form" | "finder" | "success";

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

export function ContributeDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs */
  const titleInputRef = useRef<HTMLDivElement>(null);
  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLDivElement>(null);
  const finderFileRef = useRef<HTMLDivElement>(null);
  const finderOpenBtnRef = useRef<HTMLDivElement>(null);

  /* Camera state — drives the zoom/pan transform on form content */
  const [cam, setCam] = useState({ scale: 1, y: 0 });
  const [camDur, setCamDur] = useState(0);
  const camRef = useRef({ scale: 1, y: 0 });

  const updateCam = (
    values: { scale: number; y: number },
    duration = 1
  ) => {
    camRef.current = values;
    setCamDur(duration);
    setCam(values);
  };

  /* Scene state */
  const [scene, setScene] = useState<Scene>("form");
  const [cycle, setCycle] = useState(0);
  const [titleText, setTitleText] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const [fileHighlighted, setFileHighlighted] = useState(false);
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

    /* Camera-aware cursor positioning.
       When camera transforms the form content, cursor positions
       are adjusted so they visually align with the scaled elements. */
    const moveTo = async (
      ref: RefObject<HTMLElement | null>,
      duration = 0.8,
      moveEase: readonly number[] = easeSoft
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const pos = getElPos(ref.current, containerRef.current);
      const c = camRef.current;
      const cw = containerRef.current?.offsetWidth || 420;
      const cx = cw / 2;

      // Apply camera transform: origin is (center, CHROME_H)
      const vx = cx + (pos.x - cx) * c.scale;
      const vy = CHROME_H + (pos.y - CHROME_H) * c.scale + c.y;

      await animateCursor(
        cursorScope.current,
        { x: vx, y: vy },
        { duration, ease: moveEase as [number, number, number, number] }
      );
    };

    /* Tracked move — camera + cursor move together with identical
       duration & easing so cursor stays at viewport center.
       Content slides underneath like a professional tracking shot. */
    const trackTo = async (
      ref: RefObject<HTMLElement | null>,
      scale: number,
      duration = 0.9
    ) => {
      // Start camera pan to center the target element
      updateCam({ scale, y: centerCamOn(ref, scale) }, duration);
      // Simultaneously move cursor — same duration + easing = lockstep
      await moveTo(ref, duration, appleEase);
    };

    const typeText = async (text: string, delayMs = 70) => {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setTitleText(text.slice(0, i));
        await pause(delayMs);
      }
    };

    /* Calculate camera Y to center a given element in the viewport.
       Uses untransformed offsetTop positions + camera scale to find
       the exact pan that places the element at viewport center. */
    const centerCamOn = (
      ref: RefObject<HTMLElement | null>,
      scale: number
    ): number => {
      if (!ref.current || !containerRef.current) return 0;
      const pos = getElPos(ref.current, containerRef.current);
      // Element position within the camera wrapper (below chrome)
      const elInCam = pos.y - CHROME_H;
      // Camera Y that places scaled element at viewport center
      const camY = VIEWPORT_H / 2 - elInCam * scale;
      return Math.min(0, camY); // never pan below origin (no empty space above)
    };

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setScene("form");
      setTitleText("");
      setFileSelected(false);
      setFileHighlighted(false);
      setSubmitting(false);
      updateCam({ scale: 1, y: 0 }, 0); // reset camera instantly

      if (!cursorScope.current) return;

      // Position cursor, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 140 },
        { duration: 0 }
      );
      await pause(500);
      if (cancelled) return;

      /* ── FORM SCENE — cinematic tracking shot ── */
      const S = 1.25; // gentle zoom scale

      // Initial zoom — center on title input before cursor appears
      updateCam({ scale: S, y: centerCamOn(titleInputRef, S) }, 1.8);
      await pause(1000); // let zoom settle
      if (cancelled) return;

      // Fade cursor in at center of frame
      if (!cursorScope.current) return;
      const initPos = getElPos(titleInputRef.current, containerRef.current);
      const cw = containerRef.current?.offsetWidth || 420;
      await animateCursor(
        cursorScope.current,
        {
          opacity: 1,
          x: cw / 2 + (initPos.x - cw / 2) * S,
          y: CHROME_H + (initPos.y - CHROME_H) * S + camRef.current.y,
        },
        { duration: 0 }
      );
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.4 }
      );
      await pause(200);
      if (cancelled) return;

      // 1. Click title input and type (cursor already centered on it)
      await click();
      if (cancelled) return;
      await pause(200);
      await typeText("Midterm Notes Ch.1-5");
      if (cancelled) return;
      await pause(400);

      // 2. Track to upload zone — camera + cursor move in lockstep
      await trackTo(uploadZoneRef, S, 1.2);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(300);

      // Reset camera for Finder scene (no zoom)
      updateCam({ scale: 1, y: 0 }, 0);

      // 3. Show Finder dialog
      setScene("finder");
      await pause(800);
      if (cancelled) return;

      // Click the file in Finder (normal cursor, no tracking)
      await moveTo(finderFileRef, 0.7);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setFileHighlighted(true);
      await pause(500);
      if (cancelled) return;

      // Click "Open" button
      await moveTo(finderOpenBtnRef, 0.5);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(300);

      // 4. Back to form with file selected
      setFileSelected(true);
      setFileHighlighted(false);
      setScene("form");
      await pause(500); // let scene transition settle
      if (cancelled) return;

      // 5. Track to submit button — camera zooms + centers, cursor follows
      await trackTo(submitBtnRef, S, 1.2);
      if (cancelled) return;
      await click();
      if (cancelled) return;

      // Button shows "Submitting..." (matches real behavior)
      setSubmitting(true);
      await pause(1500);
      if (cancelled) return;

      /* ── SUCCESS SCENE ── */
      // Reset camera + fade cursor out
      updateCam({ scale: 1, y: 0 }, 0);
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      setScene("success");
      await pause(1000);
      if (cancelled) return;

      await pause(3500);

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
        {/* Persistent shared layout — gradient never fades between scenes */}
        <DashboardGradient />

        <AnimatePresence mode="wait">
          {/* ── Form with camera ── */}
          {scene === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0"
            >
              {/* Camera wrapper — zooms/pans the entire form page */}
              <motion.div
                animate={{ scale: cam.scale, y: cam.y }}
                transition={{ duration: camDur, ease: appleEase }}
                style={{ transformOrigin: "center top" }}
              >
                {/* Extended height — tall enough to fill viewport at any pan position */}
                <div className="relative min-h-[600px]">
                  <DashboardGradient />
                  <div className="relative z-10 flex flex-col">
                    <MiniTopBar />
                    {/* PageHeader */}
                    <div className="px-4 pt-1 text-center">
                      <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                        Contribute
                      </div>
                    </div>

                    {/* Form card */}
                    <div className="flex items-start justify-center px-8 pt-3">
                      <div className="w-full max-w-[280px] rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                        {/* Mode toggle */}
                        <div className="flex items-center justify-center rounded-full bg-gray-900/5 p-[3px] dark:bg-white/5">
                          <div className="flex-1 rounded-full bg-white py-[5px] text-center text-[7px] font-medium text-gray-900 shadow-sm dark:bg-white/15 dark:text-white">
                            File Upload
                          </div>
                          <div className="flex-1 py-[5px] text-center text-[7px] text-gray-900/40 dark:text-white/40">
                            Text Notes
                          </div>
                        </div>

                        {/* Course — pre-selected */}
                        <div className="mt-3">
                          <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                            Course
                          </div>
                          <div className="flex h-[22px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 text-center dark:border-white/20 dark:bg-white/10">
                            <span className="text-[7px] text-gray-900 dark:text-white">
                              Data Structures
                            </span>
                          </div>
                        </div>

                        {/* Title input */}
                        <div className="mt-2.5">
                          <div className="mb-1 text-center text-[6px] font-medium text-gray-900/60 dark:text-white/60">
                            Title
                          </div>
                          <div
                            ref={titleInputRef}
                            className="flex h-[22px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-3 dark:border-white/20 dark:bg-white/10"
                          >
                            <span
                              className={`text-[7px] ${
                                titleText
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-900/40 dark:text-white/40"
                              }`}
                            >
                              {titleText || "Title"}
                            </span>
                            {titleText && (
                              <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                                className="ml-px inline-block h-[8px] w-[1px] bg-gray-900 dark:bg-white"
                              />
                            )}
                          </div>
                        </div>

                        {/* File upload zone */}
                        <div className="mt-2.5">
                          <div
                            ref={uploadZoneRef}
                            className="flex min-h-[48px] flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-gray-900/10 bg-gray-900/[0.02] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02]"
                          >
                            {fileSelected ? (
                              <>
                                <span className="text-[7px] font-medium text-gray-900 dark:text-white">
                                  midterm-notes.pdf
                                </span>
                                <span className="mt-0.5 text-[6px] text-gray-900/40 dark:text-white/40">
                                  2.4 MB
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[7px] text-gray-900/40 dark:text-white/40">
                                  Click To Upload Or Drag & Drop
                                </span>
                                <span className="mt-0.5 text-[5px] text-gray-900/25 dark:text-white/25">
                                  PDF, Images, Documents
                                </span>
                              </>
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
                            {submitting ? "Submitting..." : "Submit Contribution"}
                          </div>
                        </div>

                        {/* My Contributions link */}
                        <div className="mt-2.5 text-center">
                          <span className="text-[6px] text-gray-900/30 underline dark:text-white/30">
                            My Contributions
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Finder dialog ── */}
          {scene === "finder" && (
            <motion.div
              key="finder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="absolute inset-0"
            >
              <div className="relative z-10 flex h-full items-center justify-center px-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease }}
                  className="w-full max-w-[300px] overflow-hidden rounded-lg border border-gray-900/15 bg-white shadow-xl dark:border-white/20 dark:bg-gray-800"
                >
                  {/* Title bar */}
                  <div className="flex items-center gap-1.5 border-b border-gray-900/10 bg-gray-100 px-2.5 py-1.5 dark:border-white/10 dark:bg-gray-700">
                    <div className="h-[7px] w-[7px] rounded-full bg-[#ff5f57]" />
                    <div className="h-[7px] w-[7px] rounded-full bg-[#febc2e]" />
                    <div className="h-[7px] w-[7px] rounded-full bg-[#28c840]" />
                    <span className="ml-2 flex-1 text-center text-[7px] font-medium text-gray-500 dark:text-gray-300">
                      Open
                    </span>
                  </div>
                  {/* Sidebar + content */}
                  <div className="flex">
                    <div className="w-[70px] border-r border-gray-900/10 bg-gray-50 p-2 dark:border-white/10 dark:bg-gray-750">
                      <div className="text-[5px] font-semibold uppercase text-gray-400 dark:text-gray-500">
                        Favorites
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <div className="rounded px-1 py-0.5 text-[6px] text-gray-600 dark:text-gray-300">
                          Desktop
                        </div>
                        <div className="rounded bg-[#5227FF]/10 px-1 py-0.5 text-[6px] font-medium text-[#5227FF] dark:text-[#a78bfa]">
                          Documents
                        </div>
                        <div className="rounded px-1 py-0.5 text-[6px] text-gray-600 dark:text-gray-300">
                          Downloads
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[7px] text-gray-500 dark:text-gray-400">
                          <span className="text-[8px]">📁</span>
                          Homework
                        </div>
                        <div
                          ref={finderFileRef}
                          className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[7px] transition-colors ${
                            fileHighlighted
                              ? "bg-[#5227FF] text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span className="text-[8px]">📄</span>
                          midterm-notes.pdf
                        </div>
                        <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[7px] text-gray-500 dark:text-gray-400">
                          <span className="text-[8px]">📄</span>
                          lecture-slides.pptx
                        </div>
                        <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[7px] text-gray-500 dark:text-gray-400">
                          <span className="text-[8px]">📷</span>
                          whiteboard-photo.jpg
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Bottom bar */}
                  <div className="flex items-center justify-end gap-1.5 border-t border-gray-900/10 bg-gray-50 px-3 py-1.5 dark:border-white/10 dark:bg-gray-700">
                    <div className="rounded px-3 py-[3px] text-[6px] font-medium text-gray-500 dark:text-gray-400">
                      Cancel
                    </div>
                    <div
                      ref={finderOpenBtnRef}
                      className="rounded bg-[#5227FF] px-3 py-[3px] text-[6px] font-medium text-white"
                    >
                      Open
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {scene === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-0"
            >
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-10">
                <motion.img
                  src={`${R2}/images/submitted-docs.webp`}
                  alt=""
                  className="mb-3 w-[100px] object-contain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease, delay: 0.1 }}
                />
                <motion.div
                  className="w-full max-w-[250px] rounded-2xl border border-gray-900/10 bg-white/50 px-5 py-4 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease, delay: 0.25 }}
                >
                  <div className="font-display text-[12px] font-light text-gray-900 dark:text-white">
                    Contribution Submitted
                  </div>
                  <div className="mt-1 text-[7px] text-gray-900/50 dark:text-white/50">
                    Your materials are being reviewed by our AI teachers
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <div className="flex flex-1 items-center justify-center rounded-full border border-gray-900/15 py-1 text-[6px] font-medium text-gray-900 dark:border-white/20 dark:text-white">
                      Submit Another
                    </div>
                    <div className="flex flex-1 items-center justify-center rounded-full bg-[#5227FF] py-1 text-[6px] font-medium text-white">
                      My Contributions
                    </div>
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
