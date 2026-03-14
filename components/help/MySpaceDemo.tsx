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

type Scene = "tabs" | "notes" | "mindmap";

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

export function MySpaceDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const notesCardRef = useRef<HTMLDivElement>(null);
  const noteItemRef = useRef<HTMLDivElement>(null);
  const mindmapCenterRef = useRef<HTMLDivElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("tabs");
  const [cycle, setCycle] = useState(0);
  const [highlightCard, setHighlightCard] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState(false);
  const [visibleNodes, setVisibleNodes] = useState(0);

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

      setScene("tabs");
      setHighlightCard(null);
      setExpandedNote(false);
      setVisibleNodes(0);

      if (!cursorScope.current) return;

      // Position cursor center, hidden
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Tabs — click Notes card ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(400);
      if (cancelled) return;

      // Move to Notes card
      await moveTo(notesCardRef, 0.8);
      if (cancelled) return;
      setHighlightCard("notes");
      await pause(300);
      await click();
      if (cancelled) return;
      await pause(400);

      /* ── SCENE 2: Notes list ── */
      setHighlightCard(null);
      setScene("notes");
      await pause(900);
      if (cancelled) return;

      // Move to a note item
      await moveTo(noteItemRef, 0.7);
      if (cancelled) return;
      setHighlightCard("note-1");
      await pause(400);
      await click();
      if (cancelled) return;

      // Expand the note
      setExpandedNote(true);
      await pause(2000);
      if (cancelled) return;

      /* ── SCENE 3: Mind map ── */
      setHighlightCard(null);
      setExpandedNote(false);
      setScene("mindmap");
      await pause(800);
      if (cancelled) return;

      // Move cursor to center of mind map
      await moveTo(mindmapCenterRef, 0.7);
      if (cancelled) return;

      // Animate nodes appearing one by one
      for (let i = 1; i <= 4; i++) {
        if (cancelled) return;
        setVisibleNodes(i);
        await pause(500);
      }

      await pause(3000);
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

  /* ─── Mind map node positions (relative to center) ─── */
  const mindmapNodes = [
    { label: "Arrays", angle: -45, distance: 70 },
    { label: "Linked Lists", angle: 45, distance: 75 },
    { label: "Trees", angle: 135, distance: 70 },
    { label: "Graphs", angle: -135, distance: 75 },
  ];

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
          {/* ── Scene 1: Tabs ── */}
          {scene === "tabs" && (
            <motion.div
              key="tabs"
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
                    My Space
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Your Personal Workspace
                  </div>
                </div>

                {/* Three cards — same style as BrowseDemo dashboard */}
                <div className="flex flex-1 items-center justify-center px-6 pb-4">
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { title: "Notes", desc: "Write On Paper", key: "notes", image: `${R2}/images/my-notes.webp` },
                      { title: "Mind Map", desc: "Connect Ideas", key: "mindmap", image: `${R2}/images/my-mindmap.webp` },
                      { title: "Tasks", desc: "Track Homework", key: "tasks", image: `${R2}/images/my-tasks.webp` },
                    ].map((card) => (
                      <div
                        key={card.key}
                        ref={card.key === "notes" ? notesCardRef : undefined}
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
                <MiniBackButton />
              </div>
            </motion.div>
          )}

          {/* ── Scene 2: Notes list ── */}
          {scene === "notes" && (
            <motion.div
              key="notes"
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
                    Notes
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    12 Notes
                  </div>
                </div>

                {/* Notes list */}
                <div className="flex flex-1 flex-col items-center overflow-hidden px-5 pt-3">
                  <div className="w-full max-w-[300px] space-y-2">
                    {[
                      {
                        title: "Data Structures Summary",
                        date: "Mar 12, 2026",
                        key: "note-1",
                      },
                      {
                        title: "Algorithm Complexity",
                        date: "Mar 10, 2026",
                        key: "note-2",
                      },
                      {
                        title: "Binary Trees Review",
                        date: "Mar 8, 2026",
                        key: "note-3",
                      },
                    ].map((note) => (
                      <div
                        key={note.key}
                        ref={note.key === "note-1" ? noteItemRef : undefined}
                        className={`overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl transition-all duration-300 dark:bg-white/5 ${
                          highlightCard === note.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        <div className="px-3 py-2 text-center">
                          <div className="font-display text-[8px] font-light text-gray-900 dark:text-white">
                            {note.title}
                          </div>
                          <div className="mt-0.5 text-[5px] text-gray-900/40 dark:text-white/40">
                            {note.date}
                          </div>
                        </div>
                        {/* Expanded content */}
                        <AnimatePresence>
                          {expandedNote && note.key === "note-1" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-gray-900/5 px-3 pb-2.5 pt-2 dark:border-white/5">
                                {/* Skeleton text lines */}
                                <div className="space-y-1.5">
                                  <div className="mx-auto h-1 w-[90%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                  <div className="mx-auto h-1 w-[75%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                  <div className="mx-auto h-1 w-[85%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                </div>
                                {/* Image placeholder */}
                                <div className="mx-auto mt-2 flex h-[28px] w-[60%] items-center justify-center rounded-md bg-gray-900/[0.04] dark:bg-white/[0.04]">
                                  <div className="text-[6px] text-gray-900/30 dark:text-white/30">
                                    Image
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
                <MiniBackButton />
              </div>
            </motion.div>
          )}

          {/* ── Scene 3: Mind map ── */}
          {scene === "mindmap" && (
            <motion.div
              key="mindmap"
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
                    Mind Map
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Data Structures
                  </div>
                </div>

                {/* Mind map visualization */}
                <div className="flex flex-1 items-center justify-center px-5">
                  <div className="relative h-[180px] w-[260px]">
                    {/* SVG lines connecting center to nodes */}
                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox="0 0 260 180"
                    >
                      {mindmapNodes.map((node, i) => {
                        const cx = 130;
                        const cy = 90;
                        const rad = (node.angle * Math.PI) / 180;
                        const nx = cx + Math.cos(rad) * node.distance;
                        const ny = cy + Math.sin(rad) * node.distance;
                        return (
                          <motion.line
                            key={node.label}
                            x1={cx}
                            y1={cy}
                            x2={nx}
                            y2={ny}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-gray-900/15 dark:text-white/15"
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: visibleNodes >= i + 1 ? 1 : 0,
                            }}
                            transition={{ duration: 0.4, ease }}
                          />
                        );
                      })}
                    </svg>

                    {/* Center node */}
                    <div
                      ref={mindmapCenterRef}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, ease }}
                        className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#5227FF]/30 bg-[#5227FF]/10 backdrop-blur-xl dark:bg-[#5227FF]/20"
                      >
                        <div className="text-center font-display text-[5px] font-light leading-tight text-[#5227FF] dark:text-[#a78bfa]">
                          Data
                          <br />
                          Structures
                        </div>
                      </motion.div>
                    </div>

                    {/* Outer nodes */}
                    {mindmapNodes.map((node, i) => {
                      const cx = 130;
                      const cy = 90;
                      const rad = (node.angle * Math.PI) / 180;
                      const nx = cx + Math.cos(rad) * node.distance;
                      const ny = cy + Math.sin(rad) * node.distance;
                      return (
                        <motion.div
                          key={node.label}
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{ left: nx, top: ny }}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: visibleNodes >= i + 1 ? 1 : 0,
                          }}
                          transition={{ duration: 0.4, ease }}
                        >
                          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-gray-900/10 bg-white/60 backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
                            <div className="text-center font-display text-[5px] font-light leading-tight text-gray-900 dark:text-white">
                              {node.label}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
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
