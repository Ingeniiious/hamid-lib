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

type Scene = "list" | "code" | "approval";

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

/* ─── Mini PresentationCard with hover overlay ─── */

function MiniCard({
  fileName,
  fileType,
  fileSize,
  presentBtnRef,
  toggleRef,
  approvalOn,
  codeVisible,
  codeChars,
  codeRevealed,
  copyBtnRef,
  countdownSec,
  approvalVisible,
  approveBtnRef,
  approvalDone,
}: {
  fileName: string;
  fileType: string;
  fileSize: string;
  presentBtnRef?: React.RefObject<HTMLDivElement | null>;
  toggleRef?: React.RefObject<HTMLDivElement | null>;
  approvalOn: boolean;
  codeVisible: boolean;
  codeChars: string[];
  codeRevealed: number;
  copyBtnRef?: React.RefObject<HTMLDivElement | null>;
  countdownSec: number;
  approvalVisible: boolean;
  approveBtnRef?: React.RefObject<HTMLDivElement | null>;
  approvalDone: boolean;
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
      {/* Grain noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="relative z-10 p-3">
        {/* Top row: file type badge + delete */}
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
          {/* 2-Step toggle */}
          <div
            ref={toggleRef}
            className="flex items-center gap-1"
          >
            <div
              className={`relative h-[10px] w-[18px] rounded-full transition-colors duration-300 ${
                approvalOn ? "bg-[#5227FF]" : "bg-gray-900/15 dark:bg-white/20"
              }`}
            >
              <motion.div
                className="absolute top-0 h-[10px] w-[10px] rounded-full bg-white shadow-sm"
                animate={{ x: approvalOn ? 8 : 0 }}
                transition={{ duration: 0.2, ease }}
              />
            </div>
            <span className="text-[5px] text-gray-900/50 dark:text-white/50">
              2-Step
            </span>
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
              {/* Individual character boxes */}
              <div className="flex items-center justify-center gap-[2px]">
                {codeChars.map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: i < codeRevealed ? 1 : 0 }}
                    transition={{ duration: 0.3, ease, delay: i < codeRevealed ? i * 0.05 : 0 }}
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

              {/* Copy + Timer */}
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

        {/* Approval Request */}
        <AnimatePresence>
          {approvalVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2"
            >
              <p className="text-center text-[6px] font-medium text-amber-600 dark:text-amber-400">
                Someone Is Requesting Access
              </p>
              <p className="mt-0.5 text-center text-[4px] text-amber-600/60 dark:text-amber-400/60">
                A device entered your code and is waiting for approval.
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <div
                  ref={approveBtnRef}
                  className={`rounded-[3px] px-2.5 py-0.5 text-[5px] font-medium text-white ${
                    approvalDone ? "bg-green-600/50" : "bg-green-600"
                  }`}
                >
                  {approvalDone ? "Approved!" : "Approve"}
                </div>
                <div className="rounded-[3px] bg-red-500 px-2.5 py-0.5 text-[5px] font-medium text-white">
                  Reject
                </div>
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
  const toggleRef = useRef<HTMLDivElement>(null);
  const approveBtnRef = useRef<HTMLDivElement>(null);

  /* Scene state */
  const [scene, setScene] = useState<Scene>("list");
  const [cycle, setCycle] = useState(0);

  /* Code display state */
  const [codeVisible, setCodeVisible] = useState(false);
  const codeStr = "XR4K-9MWT";
  const codeChars = codeStr.split("");
  const [codeRevealed, setCodeRevealed] = useState(0);
  const [countdownSec, setCountdownSec] = useState(87);

  /* Approval state */
  const [approvalOn, setApprovalOn] = useState(false);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);

  /* Progress bar */
  const [progressAnimated, setProgressAnimated] = useState(false);

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

      setScene("list");
      setCodeVisible(false);
      setCodeRevealed(0);
      setCountdownSec(87);
      setApprovalOn(false);
      setApprovalVisible(false);
      setApprovalDone(false);
      setProgressAnimated(false);

      if (!cursorScope.current) return;

      // Position cursor, hidden
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

      /* ── SCENE 1: LIST — click Present ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      // Move to Present button
      await moveTo(presentBtnRef, 0.8);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(300);

      /* ── SCENE 2: CODE DISPLAY ── */
      setScene("code");
      setCodeVisible(true);

      // Stagger-reveal code characters
      for (let i = 1; i <= codeChars.length; i++) {
        if (cancelled) return;
        setCodeRevealed(i);
        await pause(80);
      }

      await pause(600);
      if (cancelled) return;

      // Countdown a bit
      setCountdownSec(85);
      await pause(400);
      if (cancelled) return;

      // Move cursor to Copy Code
      await moveTo(copyBtnRef, 0.7);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(1200);
      if (cancelled) return;

      /* ── SCENE 3: APPROVAL ── */

      // Hide cursor briefly
      if (cursorScope.current) {
        await animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        );
      }

      setScene("approval");
      setCodeVisible(false);
      setApprovalOn(true);

      await pause(800);
      if (cancelled) return;

      // Show approval request
      setApprovalVisible(true);
      await pause(800);
      if (cancelled) return;

      // Fade cursor back in
      if (!cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { opacity: 0, x: 210, y: 250 },
        { duration: 0 }
      );
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(300);
      if (cancelled) return;

      // Move to Approve button
      await moveTo(approveBtnRef, 0.7);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;

      // Approved
      setApprovalDone(true);
      await pause(1500);
      if (cancelled) return;

      // Fade cursor out
      if (cursorScope.current) {
        await animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }

      // Hold
      await pause(2500);

      // Loop
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isInView, cycle, animateCursor, cursorScope, codeChars.length]);

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
          {/* ── Scene 1: List view ── */}
          {scene === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* Page header */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[14px] font-light text-gray-900 dark:text-white">
                    Presentations
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Upload And Share
                  </div>
                </div>

                {/* Progress bar — "2 / 5" */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease, delay: 0.2 }}
                  className="mt-2.5 text-center"
                >
                  <p className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    2
                    <span className="text-gray-900 dark:text-white">
                      {" "}/ 5
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

                {/* Grid: UploadCard + PresentationCard */}
                <div className="mt-3 grid grid-cols-2 gap-2 px-5">
                  {/* Upload Card (dashed border) */}
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
                    approvalOn={false}
                    codeVisible={false}
                    codeChars={codeChars}
                    codeRevealed={0}
                    countdownSec={87}
                    approvalVisible={false}
                    approvalDone={false}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 2: Code Display ── */}
          {scene === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
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
                <div className="mt-2.5 text-center">
                  <p className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    2
                    <span className="text-gray-900 dark:text-white">
                      {" "}/ 5
                    </span>
                  </p>
                  <p className="mt-0.5 text-[5px] text-gray-900 dark:text-white">
                    Files Uploaded
                  </p>
                  <div className="mx-auto mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-gray-900/20 dark:bg-white/20">
                    <div
                      className="h-full rounded-full bg-gray-900 dark:bg-white"
                      style={{ width: "40%" }}
                    />
                  </div>
                </div>

                {/* Grid with card showing code */}
                <div className="mt-3 grid grid-cols-2 gap-2 px-5">
                  {/* Upload Card */}
                  <div className="flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-gray-900/10 bg-white/30 px-2 py-5 text-center dark:border-white/15 dark:bg-white/[0.02]">
                    <span className="text-[7px] font-medium text-gray-900/70 dark:text-white/70">
                      Drop Files Here
                    </span>
                    <span className="mt-0.5 text-[5px] text-gray-900/35 dark:text-white/35">
                      PDF, PPTX, Images
                    </span>
                  </div>

                  {/* Presentation Card with code */}
                  <MiniCard
                    fileName="Lecture 7 - Recursion.pptx"
                    fileType="PPTX"
                    fileSize="5.1 MB"
                    presentBtnRef={presentBtnRef}
                    copyBtnRef={copyBtnRef}
                    approvalOn={false}
                    codeVisible={codeVisible}
                    codeChars={codeChars}
                    codeRevealed={codeRevealed}
                    countdownSec={countdownSec}
                    approvalVisible={false}
                    approvalDone={false}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 3: Approval ── */}
          {scene === "approval" && (
            <motion.div
              key="approval"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
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
                <div className="mt-2.5 text-center">
                  <p className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    2
                    <span className="text-gray-900 dark:text-white">
                      {" "}/ 5
                    </span>
                  </p>
                  <p className="mt-0.5 text-[5px] text-gray-900 dark:text-white">
                    Files Uploaded
                  </p>
                  <div className="mx-auto mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-gray-900/20 dark:bg-white/20">
                    <div
                      className="h-full rounded-full bg-gray-900 dark:bg-white"
                      style={{ width: "40%" }}
                    />
                  </div>
                </div>

                {/* Grid with card showing approval */}
                <div className="mt-3 grid grid-cols-2 gap-2 px-5">
                  {/* Upload Card */}
                  <div className="flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-gray-900/10 bg-white/30 px-2 py-5 text-center dark:border-white/15 dark:bg-white/[0.02]">
                    <span className="text-[7px] font-medium text-gray-900/70 dark:text-white/70">
                      Drop Files Here
                    </span>
                    <span className="mt-0.5 text-[5px] text-gray-900/35 dark:text-white/35">
                      PDF, PPTX, Images
                    </span>
                  </div>

                  {/* Presentation Card with approval */}
                  <MiniCard
                    fileName="Lecture 7 - Recursion.pptx"
                    fileType="PPTX"
                    fileSize="5.1 MB"
                    toggleRef={toggleRef}
                    approveBtnRef={approveBtnRef}
                    approvalOn={approvalOn}
                    codeVisible={false}
                    codeChars={codeChars}
                    codeRevealed={codeChars.length}
                    countdownSec={72}
                    approvalVisible={approvalVisible}
                    approvalDone={approvalDone}
                  />
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
