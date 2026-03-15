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

type Scene = "tabs" | "notes" | "tasks";

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

/* ─── Mini folder shape (SVG) ─── */

function MiniFolderIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
      {/* Back flap */}
      <rect x="0" y="4" width="28" height="18" rx="3" fill={color} opacity="0.85" />
      {/* Tab */}
      <path d="M0 5C0 3.34 1.34 2 3 2H10L12 5H0Z" fill={color} opacity="0.65" />
      {/* Front */}
      <rect x="0" y="8" width="28" height="14" rx="3" fill={color} />
    </svg>
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
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const taskCheckRef = useRef<HTMLButtonElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("tabs");
  const [cycle, setCycle] = useState(0);
  const [highlightCard, setHighlightCard] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState(false);

  /* Tasks scene state */
  const [taskFilter, setTaskFilter] = useState<"all" | "active">("all");
  const [taskCompleted, setTaskCompleted] = useState<Set<string>>(new Set(["task-3"]));

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
      setTaskFilter("all");
      setTaskCompleted(new Set(["task-3"]));

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

      /* ── SCENE 2: Notes explorer ── */
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

      /* ── SCENE 3: Tasks ── */
      setHighlightCard(null);
      setExpandedNote(false);
      setScene("tasks");
      await pause(900);
      if (cancelled) return;

      // Move cursor to "Active" filter tab
      await moveTo(activeTabRef, 0.7);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;

      // Switch to Active filter (hides completed task)
      setTaskFilter("active");
      await pause(800);
      if (cancelled) return;

      // Move cursor to first task checkbox
      await moveTo(taskCheckRef, 0.7);
      if (cancelled) return;
      await pause(300);
      await click();
      if (cancelled) return;

      // Mark task-1 as completed
      setTaskCompleted((prev) => new Set([...prev, "task-1"]));
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

  /* ─── Task data ─── */
  const tasks = [
    {
      key: "task-1",
      title: "Study Chapter 5",
      priority: "high" as const,
      dueDate: "Mar 15",
      subtasks: { done: 2, total: 3 },
    },
    {
      key: "task-2",
      title: "Submit Homework 3",
      priority: "medium" as const,
      dueDate: "Mar 16",
      subtasks: null,
    },
    {
      key: "task-3",
      title: "Review Notes",
      priority: "low" as const,
      dueDate: null,
      subtasks: null,
    },
  ];

  const priorityColors = {
    high: "bg-red-500/15 text-red-700 dark:text-red-400",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  };

  const visibleTasks =
    taskFilter === "active"
      ? tasks.filter((t) => !taskCompleted.has(t.key))
      : tasks;

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

          {/* ── Scene 2: Notes Explorer ── */}
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

                {/* Action buttons */}
                <div className="mt-2 flex items-center justify-center gap-1.5 px-5">
                  {["+ Note", "+ Folder", "Select"].map((label) => (
                    <div
                      key={label}
                      className="rounded-full border border-dashed border-gray-900/15 px-2.5 py-1 text-[6px] text-gray-900/40 dark:border-white/15 dark:text-white/40"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Folders section */}
                <div className="mt-2.5 px-5">
                  <div className="mb-1.5 text-center text-[6px] text-gray-900/30 dark:text-white/30">
                    Folders
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    {[
                      { name: "Physics", color: "#5227FF" },
                      { name: "Calculus", color: "#2563eb" },
                    ].map((folder) => (
                      <div key={folder.name} className="flex flex-col items-center gap-1">
                        <MiniFolderIcon color={folder.color} />
                        <span className="text-[5px] font-medium text-gray-900 dark:text-white">
                          {folder.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes section */}
                <div className="mt-2.5 px-5">
                  <div className="mb-1.5 text-center text-[6px] text-gray-900/30 dark:text-white/30">
                    Notes
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {[
                      {
                        title: "Data Structures",
                        date: "Mar 12",
                        color: "bg-amber-100 dark:bg-amber-900/30",
                        key: "note-1",
                      },
                      {
                        title: "Algorithm Notes",
                        date: "Mar 10",
                        color: "bg-blue-100 dark:bg-blue-900/30",
                        key: "note-2",
                      },
                      {
                        title: "Binary Trees",
                        date: "Mar 8",
                        color: "bg-pink-100 dark:bg-pink-900/30",
                        key: "note-3",
                      },
                    ].map((note) => (
                      <div
                        key={note.key}
                        ref={note.key === "note-1" ? noteItemRef : undefined}
                        className={`w-[80px] overflow-hidden rounded-xl border bg-white/50 backdrop-blur-xl transition-all duration-300 dark:bg-white/5 ${
                          highlightCard === note.key
                            ? "border-[#5227FF]/40 shadow-md"
                            : "border-gray-900/10 dark:border-white/15"
                        }`}
                      >
                        {/* Paper preview strip */}
                        <div className={`h-[24px] w-full ${note.color}`} />
                        {/* Title + date */}
                        <div className="px-1.5 py-1.5 text-center">
                          <div className="truncate font-display text-[6px] font-light text-gray-900 dark:text-white">
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
                              <div className="border-t border-gray-900/5 px-2 pb-2 pt-1.5 dark:border-white/5">
                                {/* Skeleton text lines */}
                                <div className="space-y-1">
                                  <div className="mx-auto h-[2px] w-[90%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                  <div className="mx-auto h-[2px] w-[70%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                  <div className="mx-auto h-[2px] w-[80%] rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]" />
                                </div>
                                {/* Image placeholder */}
                                <div className="mx-auto mt-1.5 flex h-[16px] w-[80%] items-center justify-center rounded bg-gray-900/[0.04] dark:bg-white/[0.04]">
                                  <div className="text-[4px] text-gray-900/30 dark:text-white/30">
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

          {/* ── Scene 3: Tasks ── */}
          {scene === "tasks" && (
            <motion.div
              key="tasks"
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
                    Tasks
                  </div>
                  <div className="mt-0.5 text-[8px] text-gray-900/50 dark:text-white/50">
                    Track Homework
                  </div>
                </div>

                {/* Filter tabs + Add button */}
                <div className="mt-2 flex items-center justify-center gap-2 px-5">
                  {/* Filter pills */}
                  <div className="flex items-center gap-0.5 rounded-full bg-gray-900/5 p-0.5 dark:bg-white/5">
                    {(["All", "Active", "Done"] as const).map((tab) => {
                      const tabKey = tab.toLowerCase() as "all" | "active" | "done";
                      const isActive =
                        (taskFilter === "all" && tabKey === "all") ||
                        (taskFilter === "active" && tabKey === "active");
                      return (
                        <button
                          key={tab}
                          ref={tab === "Active" ? activeTabRef : undefined}
                          className={`rounded-full px-2.5 py-0.5 text-[6px] font-medium transition-all duration-300 ${
                            isActive
                              ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                              : "text-gray-900/50 dark:text-white/50"
                          }`}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Task button */}
                  <div className="rounded-full bg-[#5227FF] px-2.5 py-1 text-[6px] font-medium text-white">
                    Add Task
                  </div>
                </div>

                {/* Task cards */}
                <div className="mt-2.5 flex flex-col items-center gap-1.5 overflow-hidden px-5">
                  <AnimatePresence mode="popLayout">
                    {visibleTasks.map((task) => {
                      const isCompleted = taskCompleted.has(task.key);
                      return (
                        <motion.div
                          key={task.key}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease }}
                          className={`w-full max-w-[300px] rounded-xl border p-2 transition-colors duration-300 ${
                            isCompleted
                              ? "border-gray-900/5 bg-gray-900/[0.02] dark:border-white/5 dark:bg-white/[0.02]"
                              : "border-gray-900/10 bg-white/50 dark:border-white/10 dark:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Checkbox */}
                            <button
                              ref={task.key === "task-1" ? taskCheckRef : undefined}
                              className={`flex h-[12px] w-[12px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ${
                                isCompleted
                                  ? "border-[#5227FF] bg-[#5227FF]"
                                  : "border-gray-900/20 dark:border-white/20"
                              }`}
                            >
                              {isCompleted && (
                                <svg width="6" height="5" viewBox="0 0 10 8" fill="none">
                                  <path
                                    d="M1 4L3.5 6.5L9 1"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>

                            {/* Title + priority + date */}
                            <div className="min-w-0 flex-1 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className={`text-[7px] font-medium transition-all duration-300 ${
                                    isCompleted
                                      ? "text-gray-900/30 line-through dark:text-white/30"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {task.title}
                                </span>
                                <span
                                  className={`rounded-full px-1.5 py-[1px] text-[5px] font-medium ${
                                    priorityColors[task.priority]
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </div>

                              {/* Due date */}
                              {task.dueDate && (
                                <div className="mt-0.5 text-[5px] text-gray-900/40 dark:text-white/40">
                                  {task.dueDate}
                                </div>
                              )}

                              {/* Subtask progress bar */}
                              {task.subtasks && (
                                <div className="mt-1 flex items-center justify-center gap-1.5">
                                  <div className="h-[3px] w-[40px] overflow-hidden rounded-full bg-gray-900/10 dark:bg-white/10">
                                    <motion.div
                                      className="h-full rounded-full bg-[#5227FF]"
                                      initial={{ width: `${(task.subtasks.done / task.subtasks.total) * 100}%` }}
                                      animate={{
                                        width: isCompleted
                                          ? "100%"
                                          : `${(task.subtasks.done / task.subtasks.total) * 100}%`,
                                      }}
                                      transition={{ duration: 0.5, ease }}
                                    />
                                  </div>
                                  <span className="text-[5px] text-gray-900/40 dark:text-white/40">
                                    {isCompleted ? task.subtasks.total : task.subtasks.done}/{task.subtasks.total}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
