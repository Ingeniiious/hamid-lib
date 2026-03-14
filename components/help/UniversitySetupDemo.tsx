"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, LayoutGroup, useInView, useAnimate } from "framer-motion";
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

/* ─── Shared gradient overlay ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

/* ─── Miniature top bar ─── */

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

/* ─── Mini pill picker (replicates real UniversityPicker / FacultyPicker / ProgramPicker) ─── */

function MiniPicker({
  label,
  value,
  active,
  innerRef,
}: {
  label: string;
  value: string | null;
  active: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={innerRef}
      className={`rounded-full border px-4 py-[7px] text-center text-[9px] transition-colors duration-150 ${
        active
          ? "border-[#5227FF]/40 bg-[#5227FF]/5 dark:bg-[#5227FF]/10"
          : value
            ? "border-gray-900/15 bg-gray-900/5 dark:border-white/20 dark:bg-white/10"
            : "border-gray-900/15 bg-gray-900/5 dark:border-white/20 dark:bg-white/10"
      }`}
    >
      {value ? (
        <span className="font-medium text-gray-900 dark:text-white">
          {value}
        </span>
      ) : (
        <span className="text-gray-900/40 dark:text-white/50">{label}</span>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export function UniversitySetupDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const universityRef = useRef<HTMLDivElement>(null);
  const facultyRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);

  /* State */
  const [saved, setSaved] = useState(false);
  const [cycle, setCycle] = useState(0);

  /* Picker states — mirror the real UniversitySetup component */
  const [universityValue, setUniversityValue] = useState<string | null>(null);
  const [facultyValue, setFacultyValue] = useState<string | null>(null);
  const [programValue, setProgramValue] = useState<string | null>(null);
  const [showFaculty, setShowFaculty] = useState(false);
  const [showProgram, setShowProgram] = useState(false);

  /* UI state */
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      /* ── Reset everything ── */
      await pause(400);
      if (cancelled) return;

      setSaved(false);
      setUniversityValue(null);
      setFacultyValue(null);
      setProgramValue(null);
      setShowFaculty(false);
      setShowProgram(false);
      setActiveDropdown(null);
      setSaving(false);

      if (!cursorScope.current) return;

      // Hide cursor, position center
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 200 },
        { duration: 0 }
      );
      await pause(700);
      if (cancelled) return;

      /* ── Fade cursor in ── */
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      /* ── 1. Click University picker ── */
      await moveTo(universityRef, 0.7);
      if (cancelled) return;
      setActiveDropdown("university");
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(500);

      // "Select" university — faculties appear smoothly via LayoutGroup
      setUniversityValue("MIT");
      setActiveDropdown(null);
      await pause(400);
      if (cancelled) return;

      // Faculty picker smoothly appears (real app: AnimatePresence + layout)
      setShowFaculty(true);
      await pause(600);
      if (cancelled) return;

      /* ── 2. Click Faculty picker ── */
      await moveTo(facultyRef, 0.6);
      if (cancelled) return;
      setActiveDropdown("faculty");
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(500);

      // "Select" faculty — program picker appears smoothly
      setFacultyValue("Engineering");
      setActiveDropdown(null);
      await pause(400);
      if (cancelled) return;

      setShowProgram(true);
      await pause(600);
      if (cancelled) return;

      /* ── 3. Click Program picker ── */
      await moveTo(programRef, 0.6);
      if (cancelled) return;
      setActiveDropdown("program");
      await pause(200);
      await click();
      if (cancelled) return;
      await pause(500);

      // "Select" program
      setProgramValue("Computer Science");
      setActiveDropdown(null);
      await pause(500);
      if (cancelled) return;

      /* ── 4. Click Save & Continue ── */
      await moveTo(saveRef, 0.7);
      if (cancelled) return;
      await pause(200);
      await click();
      if (cancelled) return;

      // Saving state
      setSaving(true);
      await pause(1200);
      if (cancelled) return;

      /* ── 5. Success screen ── */
      // Fade cursor out
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }

      setSaved(true);
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
        {/* Persistent shared layout */}
        <DashboardGradient />
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Setup wizard (mirrors real UniversitySetup component) ── */}
          {!saved && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col items-center px-8">
                {/* Illustration — matches real component's Image */}
                <img
                  src={`${R2}/images/complete-profile.webp`}
                  alt=""
                  className="-mb-2 h-[80px] w-[80px] object-contain opacity-90"
                />

                {/* Title — matches real "Select Your University" */}
                <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                  Select Your University
                </div>
                <div className="mt-0.5 mb-3 text-[7px] text-gray-900/50 dark:text-white/50">
                  Choose your university to browse available courses.
                </div>

                {/* Pickers — LayoutGroup for smooth height transitions (matches real component) */}
                <LayoutGroup>
                  <div className="flex w-full max-w-[260px] flex-col gap-2">
                    {/* University picker — always visible (matches real) */}
                    <motion.div layout transition={{ duration: 0.3, ease }}>
                      <MiniPicker
                        label="Select University"
                        value={universityValue}
                        active={activeDropdown === "university"}
                        innerRef={universityRef}
                      />
                    </motion.div>

                    {/* Faculty picker — appears when faculties load (matches real AnimatePresence popLayout) */}
                    <AnimatePresence mode="popLayout">
                      {showFaculty && (
                        <motion.div
                          key="faculty-picker"
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25, ease }}
                        >
                          <MiniPicker
                            label="Select Faculty"
                            value={facultyValue}
                            active={activeDropdown === "faculty"}
                            innerRef={facultyRef}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Program picker — appears when programs load (matches real) */}
                    <AnimatePresence mode="popLayout">
                      {showProgram && (
                        <motion.div
                          key="program-picker"
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25, ease }}
                        >
                          <MiniPicker
                            label="Select Program"
                            value={programValue}
                            active={activeDropdown === "program"}
                            innerRef={programRef}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Save button — always visible, disabled when no university (matches real) */}
                    <motion.div layout transition={{ duration: 0.3, ease }}>
                      <div
                        ref={saveRef}
                        className={`mt-1 rounded-full py-[7px] text-center text-[9px] font-medium text-white transition-opacity duration-150 ${
                          saving
                            ? "bg-[#5227FF]/70"
                            : universityValue
                              ? "bg-[#5227FF]"
                              : "bg-[#5227FF]/50"
                        }`}
                      >
                        {saving ? "Saving..." : "Save & Continue"}
                      </div>
                    </motion.div>
                  </div>
                </LayoutGroup>
              </div>
            </motion.div>
          )}

          {/* ── Success screen (mirrors real "All Set!" view) ── */}
          {saved && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px] flex items-center justify-center px-8"
            >
              <div className="relative z-10 w-full text-center">
                {/* Large "All Set!" heading — matches real */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="font-display text-[28px] font-light text-gray-900 dark:text-white"
                >
                  All Set!
                </motion.div>

                {/* University + subtitle — matches real "{university} — let's explore" */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="mt-2 text-[9px] text-gray-900/50 dark:text-white/50"
                >
                  MIT — let&apos;s explore your courses.
                </motion.div>

                {/* "Go To My Courses" button — matches real */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mx-auto mt-5 w-[140px] rounded-full bg-[#5227FF] py-[7px] text-center text-[9px] font-medium text-white"
                >
                  Go To My Courses
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
