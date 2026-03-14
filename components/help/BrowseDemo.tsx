"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
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

type Scene = "dashboard" | "faculties" | "courses" | "detail";

/* ─── Shared gradient overlay (all dashboard pages have this) ─── */

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

/* ─── Miniature back button ─── */

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

/* ─── Main component ─── */

export function BrowseDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const coursesCardRef = useRef<HTMLDivElement>(null);
  const csCardRef = useRef<HTMLDivElement>(null);
  const dsCardRef = useRef<HTMLDivElement>(null);
  const teachingTabRef = useRef<HTMLDivElement>(null);
  const studyingTabRef = useRef<HTMLDivElement>(null);
  const examTabRef = useRef<HTMLDivElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("dashboard");
  const [cycle, setCycle] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [highlightCard, setHighlightCard] = useState<string | null>(null);

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

      setScene("dashboard");
      setActiveTab(0);
      setHighlightCard(null);

      if (!cursorScope.current) return;

      // Position cursor center, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Dashboard — click Courses card ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      // Move to Courses card
      await moveTo(coursesCardRef, 0.8);
      if (cancelled) return;
      setHighlightCard("courses");
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 2: Faculties grid ── */
      setHighlightCard(null);
      setScene("faculties");
      await pause(900);
      if (cancelled) return;

      // Move to Computer Science faculty card
      await moveTo(csCardRef, 0.7);
      if (cancelled) return;
      setHighlightCard("cs");
      await pause(400);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 3: Courses list ── */
      setHighlightCard(null);
      setScene("courses");
      await pause(900);
      if (cancelled) return;

      // Move to Data Structures course
      await moveTo(dsCardRef, 0.7);
      if (cancelled) return;
      setHighlightCard("ds");
      await pause(400);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 4: Course detail with tabs ── */
      setHighlightCard(null);
      setScene("detail");
      await pause(900);
      if (cancelled) return;

      // Click Teaching tab
      await moveTo(teachingTabRef, 0.6);
      if (cancelled) return;
      setActiveTab(0);
      await click();
      if (cancelled) return;
      await pause(800);

      // Click Studying tab
      await moveTo(studyingTabRef, 0.6);
      if (cancelled) return;
      setActiveTab(1);
      await click();
      if (cancelled) return;
      await pause(800);

      // Click Exam tab
      await moveTo(examTabRef, 0.6);
      if (cancelled) return;
      setActiveTab(2);
      await click();
      if (cancelled) return;
      await pause(1200);

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
        {/* Persistent shared layout — gradient + top bar never fade between scenes */}
        <DashboardGradient />
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Dashboard ── */}
          {scene === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="mt-1 text-center font-display text-[15px] font-light text-gray-900 dark:text-white">
                  Good Morning, Sarah
                </div>
                <div className="flex flex-1 items-center justify-center px-6 pb-4">
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { title: "My Studies", desc: "Track Progress", img: `${R2}/images/my-studies.webp`, key: "studies" },
                      { title: "My Space", desc: "Notes & More", img: `${R2}/images/my-space.webp`, key: "space" },
                      { title: "Courses", desc: "Browse All", img: `${R2}/images/courses.webp`, key: "courses" },
                    ].map((card) => (
                      <div
                        key={card.key}
                        ref={card.key === "courses" ? coursesCardRef : undefined}
                        className={`overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl transition-all duration-200 dark:bg-white/5 ${
                          highlightCard === card.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-center px-2 pt-2">
                          <img
                            src={card.img}
                            alt={card.title}
                            className="h-[52px] w-[52px] object-contain"
                          />
                        </div>
                        <div className="px-1 pb-2 pt-1 text-center">
                          <div className="font-display text-[7px] font-light text-gray-900 dark:text-white">
                            {card.title}
                          </div>
                          <div className="mt-0.5 text-[5px] text-gray-900/50 dark:text-white/50">
                            {card.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Faculties grid ── */}
          {scene === "faculties" && (
            <motion.div
              key="faculties"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* PageHeader */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[14px] font-light text-gray-900 dark:text-white">
                    Courses
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Browse By Faculty
                  </div>
                </div>
                {/* Faculty grid — same card style as DashboardCard/FacultyCard
                    Real: rounded-[2rem], aspect-[4/3], bg-white/50 backdrop-blur-xl, illustration + title at bottom */}
                <div className="flex flex-1 items-start justify-center overflow-hidden px-6 pt-3">
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { name: "Engineering", count: 12, key: "cs", img: `${R2}/images/majors/engineering.webp` },
                      { name: "Business", count: 8, key: "biz", img: `${R2}/images/majors/business.webp` },
                      { name: "Medicine", count: 9, key: "med", img: `${R2}/images/majors/medicine.webp` },
                      { name: "Natural Sciences", count: 6, key: "sci", img: `${R2}/images/majors/natural-sciences.webp` },
                      { name: "Law", count: 4, key: "law", img: `${R2}/images/majors/law.webp` },
                      { name: "Education", count: 5, key: "edu", img: `${R2}/images/majors/education.webp` },
                    ].map((f) => (
                      <div
                        key={f.key}
                        ref={f.key === "cs" ? csCardRef : undefined}
                        className={`flex aspect-square flex-col items-center justify-between overflow-hidden rounded-lg border bg-white/50 px-1 pb-1.5 pt-2 backdrop-blur-xl transition-all duration-200 dark:bg-white/5 ${
                          highlightCard === f.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        {/* Illustration */}
                        <div className="flex flex-1 items-center justify-center">
                          <img
                            src={f.img}
                            alt={f.name}
                            className="h-[36px] w-[36px] object-contain"
                          />
                        </div>
                        {/* Text — pinned at bottom */}
                        <div className="shrink-0 text-center">
                          <div className="font-display text-[6px] font-light leading-tight text-gray-900 dark:text-white">
                            {f.name}
                          </div>
                          <div className="mt-0.5 text-[5px] text-gray-900/50 dark:text-white/50">
                            {f.count} Courses
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <MiniBackButton />
              </div>
            </motion.div>
          )}

          {/* ── Course list ── */}
          {scene === "courses" && (
            <motion.div
              key="courses"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* PageHeader */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[14px] font-light text-gray-900 dark:text-white">
                    Engineering
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    12 Courses
                  </div>
                </div>
                {/* Course cards — same shared card style as CourseCard
                    Real: rounded-[2rem], aspect-[4/3], bg-white/50 backdrop-blur-xl, text-only centered content */}
                <div className="flex flex-1 items-start justify-center overflow-hidden px-6 pt-3">
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { name: "Data Structures", prof: "Prof. Johnson", key: "ds" },
                      { name: "Algorithms", prof: "Prof. Williams", key: "algo" },
                      { name: "Database Systems", prof: "Prof. Davis", key: "db" },
                      { name: "Networks", prof: "Prof. Chen", key: "net" },
                      { name: "Operating Systems", prof: "Prof. Lee", key: "os" },
                      { name: "AI & ML", prof: "Prof. Kim", key: "ai" },
                    ].map((c) => (
                      <div
                        key={c.key}
                        ref={c.key === "ds" ? dsCardRef : undefined}
                        className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl transition-all duration-200 dark:bg-white/5 ${
                          highlightCard === c.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        <div className="px-1 text-center">
                          <div className="font-display text-[7px] font-light leading-tight text-gray-900 dark:text-white">
                            {c.name}
                          </div>
                          <div className="mt-0.5 text-[5px] text-gray-900/40 dark:text-white/40">
                            {c.prof}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <MiniBackButton />
              </div>
            </motion.div>
          )}

          {/* ── Course detail with tabs ── */}
          {scene === "detail" && (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 bottom-0 top-[38px]"
            >
              <div className="relative z-10 flex h-full flex-col">
                {/* PageHeader */}
                <div className="px-4 pt-1 text-center">
                  <div className="font-display text-[14px] font-light text-gray-900 dark:text-white">
                    Data Structures
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    An introduction to fundamental data structures
                  </div>
                </div>
                {/* Meta — Professor + Semester */}
                <div className="mt-2 flex items-center justify-center gap-2 text-[7px] text-gray-900/40 dark:text-white/40">
                  <span>Prof. Johnson</span>
                  <span className="text-gray-900/20 dark:text-white/20">|</span>
                  <span>Fall 2025</span>
                </div>
                {/* Separator */}
                <div className="mx-auto mt-3 h-px w-16 bg-gray-900/10 dark:bg-white/10" />
                {/* Tab cards */}
                <div className="mt-4 grid grid-cols-3 gap-2 px-5">
                  {[
                    { name: "Teaching", idx: 0, ref: teachingTabRef },
                    { name: "Studying", idx: 1, ref: studyingTabRef },
                    { name: "Exam", idx: 2, ref: examTabRef },
                  ].map((tab) => (
                    <div
                      key={tab.name}
                      ref={tab.ref}
                      className={`rounded-xl border p-3 text-center backdrop-blur-xl transition-all duration-200 ${
                        activeTab === tab.idx
                          ? "border-[#5227FF]/30 bg-[#5227FF]/5 dark:bg-[#5227FF]/10"
                          : "border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/5"
                      }`}
                    >
                      <div
                        className={`font-display text-[8px] font-light transition-colors duration-200 ${
                          activeTab === tab.idx
                            ? "text-[#5227FF] dark:text-[#a78bfa]"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {tab.name}
                      </div>
                      <div className="mt-1 text-[6px] text-gray-900/40 dark:text-white/40">
                        {activeTab === tab.idx ? "View Content" : "No Content Yet"}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Content preview below tabs */}
                <div className="mt-3 flex flex-1 items-start justify-center px-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-full space-y-1.5"
                    >
                      {/* Skeleton content lines */}
                      <div className="mx-auto h-1.5 w-[85%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                      <div className="mx-auto h-1.5 w-[70%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                      <div className="mx-auto h-1.5 w-[90%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                      <div className="mx-auto h-1.5 w-[60%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <MiniBackButton />
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
