"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;
const appleEase = [0.22, 1, 0.36, 1] as const;
const CHROME_H = 21;
const VIEWPORT_H = 330;
const VIEWPORT_W = 420;

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

type Phase = "dashboard" | "portal" | "waiting" | "viewer";

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

function OTPBox({ char, isActive }: { char: string; isActive: boolean }) {
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

/* ─── Mini PresentationCard ─── */

function MiniCard({
  fileName,
  fileType,
  fileSize,
  presentBtnRef,
  codeVisible,
  codeChars,
  codeRevealed,
  copyBtnRef,
  countdownSec,
}: {
  fileName: string;
  fileType: string;
  fileSize: string;
  presentBtnRef?: React.RefObject<HTMLDivElement | null>;
  codeVisible: boolean;
  codeChars: string[];
  codeRevealed: number;
  copyBtnRef?: React.RefObject<HTMLDivElement | null>;
  countdownSec: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
      {/* Hover gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.12), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.10), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="relative z-10 p-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="rounded-[3px] bg-gray-900/5 px-1.5 py-0.5 text-[5px] font-medium uppercase tracking-wide text-gray-900/50 dark:bg-white/10 dark:text-white/50">
            {fileType}
          </span>
          <span className="text-[5px] text-gray-900/30 dark:text-white/30">
            Delete
          </span>
        </div>

        {/* File name */}
        <div className="mt-2 truncate text-center font-display text-[8px] font-light text-gray-900 dark:text-white">
          {fileName}
        </div>

        {/* File size */}
        <div className="mt-0.5 text-center text-[5px] text-gray-900/40 dark:text-white/40">
          {fileSize}
        </div>

        {/* Actions row */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          <div
            ref={presentBtnRef}
            className={`flex items-center justify-center rounded-lg px-2.5 py-1 text-[5px] font-medium text-white ${
              codeVisible ? "bg-[#5227FF]/50" : "bg-[#5227FF]"
            }`}
          >
            {codeVisible ? "Active" : "Present"}
          </div>
          <div className="flex items-center justify-center rounded-lg border border-gray-900/10 px-2.5 py-1 text-[5px] font-medium text-gray-900/70 dark:border-white/15 dark:text-white/70">
            Preview
          </div>
        </div>

        {/* Code Display */}
        <AnimatePresence>
          {codeVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="mt-2.5 border-t border-gray-900/5 pt-2.5 dark:border-white/10"
            >
              <div className="flex items-center justify-center gap-[2px]">
                {codeChars.map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: i < codeRevealed ? 1 : 0 }}
                    transition={{
                      duration: 0.3,
                      ease,
                      delay: i < codeRevealed ? i * 0.05 : 0,
                    }}
                    className={`flex h-[14px] w-[12px] items-center justify-center rounded-[2px] font-mono text-[7px] font-bold ${
                      char === "-"
                        ? "bg-transparent text-gray-900/30 dark:text-white/30"
                        : "bg-gray-900/10 text-gray-900 dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    {i < codeRevealed ? char : ""}
                  </motion.span>
                ))}
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <div
                  ref={copyBtnRef}
                  className="text-[5px] text-gray-900/50 dark:text-white/50"
                >
                  Copy Code
                </div>
                <span
                  className={`font-mono text-[5px] ${
                    countdownSec <= 15
                      ? "text-red-500"
                      : "text-gray-900/50 dark:text-white/50"
                  }`}
                >
                  {countdownSec}s
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export function PresentationsDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs */
  const presentBtnRef = useRef<HTMLDivElement>(null);
  const copyBtnRef = useRef<HTMLDivElement>(null);
  const firstSlotRef = useRef<HTMLDivElement>(null);

  /* Camera state — { scale, x, y } with transform origin 0 0 */
  const [cam, setCam] = useState({ scale: 1, x: 0, y: 0 });
  const [camDur, setCamDur] = useState(0);
  const camRef = useRef({ scale: 1, x: 0, y: 0 });

  const updateCam = (
    values: { scale: number; x: number; y: number },
    duration = 1
  ) => {
    camRef.current = values;
    setCamDur(duration);
    setCam(values);
  };

  /* Phase state */
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [cycle, setCycle] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  /* Dashboard state */
  const [codeVisible, setCodeVisible] = useState(false);
  const codeStr = "XR4K-9MWT";
  const codeChars = codeStr.split("");
  const [codeRevealed, setCodeRevealed] = useState(0);
  const [countdownSec, setCountdownSec] = useState(87);
  const [progressAnimated, setProgressAnimated] = useState(false);

  /* Portal state */
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

  /* ─── Camera helpers (clamped to prevent edge gaps) ─── */

  const centerCamOn = (
    ref: RefObject<HTMLElement | null>,
    scale: number
  ): { x: number; y: number } => {
    if (!ref.current || !containerRef.current) return { x: 0, y: 0 };
    const pos = getElPos(ref.current, containerRef.current);
    const elX = pos.x;
    const elY = pos.y - CHROME_H;
    const rawX = VIEWPORT_W / 2 - elX * scale;
    const rawY = VIEWPORT_H / 2 - elY * scale;
    return {
      x: Math.max(VIEWPORT_W * (1 - scale), Math.min(0, rawX)),
      y: Math.max(VIEWPORT_H * (1 - scale), Math.min(0, rawY)),
    };
  };

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

    /* Camera-aware cursor positioning */
    const moveTo = async (
      ref: RefObject<HTMLElement | null>,
      duration = 0.8
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const pos = getElPos(ref.current, containerRef.current);
      const c = camRef.current;
      const vx = c.x + pos.x * c.scale;
      const vy = CHROME_H + c.y + (pos.y - CHROME_H) * c.scale;
      await animateCursor(
        cursorScope.current,
        { x: vx, y: vy },
        { duration, ease: easeSoft }
      );
    };

    /* Tracked move — camera + cursor move together */
    const trackTo = async (
      ref: RefObject<HTMLElement | null>,
      scale: number,
      duration = 0.9
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const camPos = centerCamOn(ref, scale);
      updateCam({ scale, ...camPos }, duration);
      const pos = getElPos(ref.current, containerRef.current);
      const vx = camPos.x + pos.x * scale;
      const vy = CHROME_H + camPos.y + (pos.y - CHROME_H) * scale;
      await animateCursor(
        cursorScope.current,
        { x: vx, y: vy },
        {
          duration,
          ease: appleEase as [number, number, number, number],
        }
      );
    };

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setPhase("dashboard");
      setCodeVisible(false);
      setCodeRevealed(0);
      setCountdownSec(87);
      setProgressAnimated(false);
      setZoomed(false);
      setTypedChars(["", "", "", "", "", "", "", ""]);
      setActiveSlot(-1);
      updateCam({ scale: 1, x: 0, y: 0 }, 0);

      if (!cursorScope.current) return;

      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );

      await pause(600);
      if (cancelled) return;
      setProgressAnimated(true);

      await pause(600);
      if (cancelled) return;

      /* ── DASHBOARD: Fade cursor in ── */
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      /* ── Zoom into Present button area ── */
      setZoomed(true);
      await trackTo(presentBtnRef, 1.8, 1.0);
      if (cancelled) return;
      await pause(300);

      /* ── Click Present ── */
      await click();
      if (cancelled) return;
      await pause(200);

      setCodeVisible(true);

      /* ── Stagger reveal code characters ── */
      for (let i = 1; i <= codeChars.length; i++) {
        if (cancelled) return;
        setCodeRevealed(i);
        await pause(80);
      }
      await pause(500);
      if (cancelled) return;

      setCountdownSec(85);
      await pause(300);
      if (cancelled) return;

      /* ── Move cursor to Copy Code ── */
      await moveTo(copyBtnRef, 0.6);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── Fade cursor out ── */
      if (cursorScope.current) {
        await animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      /* ── Zoom back out ── */
      setZoomed(false);
      updateCam({ scale: 1, x: 0, y: 0 }, 0.8);
      await pause(600);
      if (cancelled) return;

      /* ── Crossfade to Portal ── */
      setPhase("portal");
      camRef.current = { scale: 1, x: 0, y: 0 };

      await pause(800);
      if (cancelled) return;

      /* ── PORTAL: Fade cursor in ── */
      if (!cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 200 },
        { duration: 0 }
      );
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      /* ── Move to first OTP slot ── */
      await moveTo(firstSlotRef, 0.9);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(300);

      /* ── Type code characters one by one ── */
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

      /* ── Fade cursor out ── */
      if (cursorScope.current) {
        await animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      /* ── Waiting for approval ── */
      setPhase("waiting");
      await pause(3000);
      if (cancelled) return;

      /* ── File viewer ── */
      setPhase("viewer");
      await pause(4000);
      if (cancelled) return;

      /* ── Loop ── */
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, cycle]);

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
      <div className="relative z-10 h-[330px] overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ── Dashboard phase (with camera zoom) ── */}
          {phase === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="absolute inset-0"
            >
              <motion.div
                animate={{
                  scale: cam.scale,
                  x: cam.x,
                  y: cam.y,
                }}
                transition={{
                  duration: camDur,
                  ease: appleEase,
                }}
                style={{ transformOrigin: "0 0" }}
                className="h-full w-full"
              >
                <motion.div
                  animate={{ opacity: zoomed ? 0 : 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="absolute inset-0"
                >
                  <DashboardGradient />
                </motion.div>
                <div className="relative z-10">
                  <MiniTopBar />
                </div>

                <div className="relative z-10 flex flex-col">
                  {/* Page header */}
                  <div className="px-4 pt-1 text-center">
                    <div className="font-display text-[14px] font-light text-gray-900 dark:text-white">
                      Presentations
                    </div>
                    <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                      Upload And Share
                    </div>
                  </div>

                  {/* Progress bar */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease, delay: 0.2 }}
                    className="mt-2.5 text-center"
                  >
                    <p className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                      2
                      <span className="text-gray-900 dark:text-white">
                        {" "}
                        / 5
                      </span>
                    </p>
                    <p className="mt-0.5 text-[5px] text-gray-900 dark:text-white">
                      Files Uploaded
                    </p>
                    <div className="mx-auto mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-gray-900/20 dark:bg-white/20">
                      <motion.div
                        className="h-full rounded-full bg-gray-900 dark:bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: progressAnimated ? "40%" : 0 }}
                        transition={{ duration: 0.8, ease }}
                      />
                    </div>
                  </motion.div>

                  {/* Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 px-5">
                    {/* Upload Card (dashed) */}
                    <div className="flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-gray-900/10 bg-white/30 px-2 py-5 text-center dark:border-white/15 dark:bg-white/[0.02]">
                      <span className="text-[7px] font-medium text-gray-900/70 dark:text-white/70">
                        Drop Files Here
                      </span>
                      <span className="mt-0.5 text-[5px] text-gray-900/35 dark:text-white/35">
                        PDF, PPTX, Images
                      </span>
                    </div>

                    {/* Presentation Card */}
                    <MiniCard
                      fileName="Lecture 7 - Recursion.pptx"
                      fileType="PPTX"
                      fileSize="5.1 MB"
                      presentBtnRef={presentBtnRef}
                      copyBtnRef={copyBtnRef}
                      codeVisible={codeVisible}
                      codeChars={codeChars}
                      codeRevealed={codeRevealed}
                      countdownSec={countdownSec}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Portal input phase ── */}
          {phase === "portal" && (
            <motion.div
              key="portal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-8"
            >
              {/* Portal illustration */}
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
                <div className="text-center font-display text-[16px] font-light text-white">
                  Portal
                </div>
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

          {/* ── Waiting for approval phase ── */}
          {phase === "waiting" && (
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

          {/* ── File viewer phase ── */}
          {phase === "viewer" && (
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
                  <div className="mb-3 h-[7px] w-[55%] rounded-full bg-gray-900/10 dark:bg-white/10" />
                  <div className="mb-1.5 h-[4px] w-[75%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[65%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[70%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mb-1.5 h-[4px] w-[60%] rounded-full bg-gray-900/5 dark:bg-white/5" />
                  <div className="mt-3 h-[28px] w-[45%] rounded bg-[#5227FF]/8 dark:bg-[#5227FF]/15" />
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
