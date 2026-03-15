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

type Scene = "landing" | "calendar";

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

/* ─── Calendar event data ─── */

const calendarEvents = [
  { title: "Math", day: 0, startHour: 9, durationHours: 1, type: "class" as const },
  { title: "Physics", day: 1, startHour: 10, durationHours: 1, type: "class" as const },
  { title: "CS Exam", day: 2, startHour: 9, durationHours: 1.5, type: "exam" as const },
  { title: "Essay Due", day: 3, startHour: 11, durationHours: 1, type: "deadline" as const },
  { title: "Study Group", day: 4, startHour: 8, durationHours: 1, type: "reminder" as const },
];

const eventColors = {
  class: {
    bg: "bg-blue-500/15",
    border: "border-blue-500",
    text: "text-blue-700 dark:text-blue-300",
  },
  exam: {
    bg: "bg-red-500/15",
    border: "border-red-500",
    text: "text-red-700 dark:text-red-300",
  },
  deadline: {
    bg: "bg-amber-500/15",
    border: "border-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  reminder: {
    bg: "bg-purple-500/15",
    border: "border-purple-500",
    text: "text-purple-700 dark:text-purple-300",
  },
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = [8, 9, 10, 11, 12];
const hourHeight = 36; // px per hour in mini calendar
const gridTop = 20; // px offset for header row

/* ─── Main component ─── */

export function MyStudiesDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const examEventRef = useRef<HTMLDivElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("landing");
  const [cycle, setCycle] = useState(0);
  const [highlightCard, setHighlightCard] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

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

      setScene("landing");
      setHighlightCard(null);
      setShowEventModal(false);

      if (!cursorScope.current) return;

      // Position cursor center, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Landing — click Calendar card ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      // Move to Calendar card
      await moveTo(calendarCardRef, 0.8);
      if (cancelled) return;
      setHighlightCard("calendar");
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 2: Calendar week view ── */
      setHighlightCard(null);
      setScene("calendar");
      await pause(900);
      if (cancelled) return;

      // Move to CS Exam event
      await moveTo(examEventRef, 0.7);
      if (cancelled) return;
      setHighlightCard("cs-exam");
      await pause(400);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── Event modal pops up over calendar ── */
      setHighlightCard(null);
      setShowEventModal(true);
      await pause(2500);
      if (cancelled) return;

      // Close modal
      setShowEventModal(false);
      await pause(800);
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
        {/* Persistent shared layout — gradient + top bar never fade between scenes */}
        <DashboardGradient />
        <div className="relative z-10">
          <MiniTopBar />
        </div>

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Landing ── */}
          {scene === "landing" && (
            <motion.div
              key="landing"
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
                    My Studies
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Track Your Progress
                  </div>
                </div>

                {/* Three cards — same style as BrowseDemo dashboard */}
                <div className="flex flex-1 items-center justify-center px-6 pb-4">
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { title: "Presentations", desc: "Share & View", key: "presentations", image: `${R2}/images/present.webp` },
                      { title: "Exam Results", desc: "Track Scores", key: "exam-results", image: `${R2}/images/exam-results.webp` },
                      { title: "Calendar", desc: "Class Schedule", key: "calendar", image: `${R2}/images/calendar.webp` },
                    ].map((card) => (
                      <div
                        key={card.key}
                        ref={card.key === "calendar" ? calendarCardRef : undefined}
                        className={`overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl transition-all duration-200 dark:bg-white/5 ${
                          highlightCard === card.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-center px-2 pt-2">
                          <img
                            src={card.image}
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

          {/* ── Scene 2: Calendar week view ── */}
          {scene === "calendar" && (
            <motion.div
              key="calendar"
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
                    Calendar
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Week View
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="flex flex-1 items-start justify-center overflow-hidden px-4 pt-2">
                  <div className="w-full max-w-[340px]">
                    {/* Day headers */}
                    <div className="flex">
                      {/* Time label spacer */}
                      <div className="w-[20px] shrink-0" />
                      {/* Day columns */}
                      {dayLabels.map((day, i) => (
                        <div
                          key={day}
                          className={`flex-1 text-center text-[6px] font-medium ${
                            i === 2
                              ? "text-[#5227FF] dark:text-[#a78bfa]"
                              : "text-gray-900/50 dark:text-white/50"
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Time grid */}
                    <div
                      className="relative mt-1"
                      style={{ height: hours.length * hourHeight }}
                    >
                      {/* Time labels + horizontal lines */}
                      {hours.map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute flex w-full items-start"
                          style={{ top: i * hourHeight }}
                        >
                          <div className="w-[20px] shrink-0 pr-1 text-right text-[5px] text-gray-900/30 dark:text-white/30">
                            {hour}
                          </div>
                          <div className="flex-1 border-t border-gray-900/[0.06] dark:border-white/[0.06]" />
                        </div>
                      ))}

                      {/* Current time indicator (at ~9:30 AM) */}
                      <div
                        className="absolute z-10 flex w-full items-center"
                        style={{ top: (1.5) * hourHeight }}
                      >
                        <div className="w-[18px] shrink-0" />
                        <div className="h-[1.5px] flex-1 bg-red-500/60" />
                        <div className="absolute left-[16px] h-[5px] w-[5px] -translate-y-[0.5px] rounded-full bg-red-500/60" />
                      </div>

                      {/* Event blocks */}
                      {calendarEvents.map((event) => {
                        const color = eventColors[event.type];
                        const topOffset = (event.startHour - hours[0]) * hourHeight + 2;
                        const height = event.durationHours * hourHeight - 3;
                        // Each day column: starts after 20px time label, then divided into 7
                        const dayWidth = `calc((100% - 20px) / 7)`;
                        const leftOffset = `calc(20px + (100% - 20px) / 7 * ${event.day} + 1px)`;
                        const eventWidth = `calc((100% - 20px) / 7 - 2px)`;

                        return (
                          <div
                            key={event.title}
                            ref={event.type === "exam" ? examEventRef : undefined}
                            className={`absolute rounded-[3px] border-l-2 px-1 py-0.5 text-[5px] font-medium ${color.bg} ${color.border} ${color.text} ${
                              highlightCard === "cs-exam" && event.type === "exam"
                                ? "ring-1 ring-[#5227FF]/40"
                                : ""
                            }`}
                            style={{
                              top: topOffset,
                              height,
                              left: leftOffset,
                              width: eventWidth,
                            }}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <MiniBackButton />
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* ── Event modal — covers the ENTIRE frame (grainient + chrome + content) ── */}
      <AnimatePresence>
        {showEventModal && (
          <>
            {/* Backdrop — absolute to root container so it covers everything */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="absolute inset-0 z-20 rounded-2xl bg-black/40"
            />

            {/* Modal card — matches real CalendarView event form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease }}
              className="absolute inset-x-5 top-1/2 z-20 -translate-y-1/2 overflow-hidden rounded-xl border border-gray-900/10 bg-white p-3 shadow-xl dark:border-white/15 dark:bg-[#1a1a2e]"
            >
              {/* Modal header */}
              <div className="text-center font-display text-[10px] font-light text-gray-900 dark:text-white">
                Edit Event
              </div>
              <div className="mt-0.5 text-center text-[6px] text-gray-900/40 dark:text-white/40">
                Wednesday, March 15
              </div>

              <div className="mt-2.5 flex flex-col gap-2">
                {/* Title input */}
                <div className="flex items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-3 py-1 dark:border-white/20 dark:bg-white/10">
                  <span className="text-[7px] text-gray-900 dark:text-white">
                    CS Exam
                  </span>
                </div>

                {/* Category pills with colored dots — matches real form */}
                <div className="flex items-center justify-center gap-1">
                  {[
                    { label: "Class", active: false, bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
                    { label: "Exam", active: true, bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
                    { label: "Deadline", active: false, bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
                    { label: "Reminder", active: false, bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
                  ].map((cat) => (
                    <div
                      key={cat.label}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[5px] font-medium ${
                        cat.active
                          ? `${cat.bg} ${cat.text} ring-1 ring-current/20`
                          : "bg-gray-900/5 text-gray-900/50 dark:bg-white/5 dark:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${cat.dot}`} />
                      {cat.label}
                    </div>
                  ))}
                </div>

                {/* Time row */}
                <div className="flex items-center justify-center gap-2">
                  <div className="rounded-full border border-gray-900/15 bg-gray-900/5 px-2.5 py-0.5 text-[6px] text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
                    9:00 AM
                  </div>
                  <span className="text-[6px] text-gray-900/30 dark:text-white/30">—</span>
                  <div className="rounded-full border border-gray-900/15 bg-gray-900/5 px-2.5 py-0.5 text-[6px] text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
                    10:30 AM
                  </div>
                </div>

                {/* Location */}
                <div className="rounded-xl border border-gray-900/10 bg-gray-900/[0.02] p-2 text-center dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-[5px] font-medium text-gray-900/40 dark:text-white/40">Location</div>
                  <div className="mt-0.5 text-[6px] text-gray-900 dark:text-white">Room 301, Building A</div>
                </div>

                {/* Alert + Notify row */}
                <div className="flex items-center justify-center gap-2">
                  <div className="rounded-full border border-gray-900/10 bg-gray-900/[0.02] px-2 py-0.5 text-[5px] text-gray-900/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
                    15 min before
                  </div>
                  <div className="rounded-full border border-gray-900/10 bg-gray-900/[0.02] px-2 py-0.5 text-[5px] text-gray-900/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
                    Every Week
                  </div>
                </div>

                {/* Notify toggle — matches real calendar */}
                <div className="flex items-center justify-center rounded-full border border-[#5227FF]/20 bg-[#5227FF]/5 py-1 dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10">
                  <span className="text-[6px] font-medium text-[#5227FF] dark:text-[#8B6FFF]">
                    Notify On
                  </span>
                </div>

                {/* Action buttons — matches real form */}
                <div className="flex gap-1.5">
                  <div className="flex-1 rounded-full bg-gray-900/5 py-1 text-center text-[6px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
                    Cancel
                  </div>
                  <div className="flex-1 rounded-full bg-[#5227FF] py-1 text-center text-[6px] font-medium text-white">
                    Save
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
