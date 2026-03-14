"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Scene = "extraction" | "council" | "published";

/* ─── Shared gradient overlay ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

/* ─── Spinning indicator ─── */

function Spinner() {
  return (
    <motion.div
      className="h-[10px] w-[10px] rounded-full border-[1.5px] border-white/20 border-t-[#5227FF]"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ─── Checkmark icon ─── */

function Checkmark() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease }}
      className="flex h-[10px] w-[10px] items-center justify-center rounded-full bg-emerald-500/90"
    >
      <svg
        width="6"
        height="6"
        viewBox="0 0 6 6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 3L2.5 4.5L5 1.5"
          stroke="white"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

/* ─── Animated progress bar ─── */

function ProgressBar({
  active,
  complete,
  delay,
}: {
  active: boolean;
  complete: boolean;
  delay: number;
}) {
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]">
      <motion.div
        className="h-full rounded-full bg-[#5227FF]"
        initial={{ width: "0%" }}
        animate={{
          width: complete ? "100%" : active ? "85%" : "0%",
        }}
        transition={{
          duration: complete ? 0.3 : 0.8,
          delay: active && !complete ? delay : 0,
          ease,
        }}
      />
    </div>
  );
}

/* ─── PDF file icon ─── */

function PdfIcon() {
  return (
    <div className="flex h-[28px] w-[22px] flex-col items-center justify-center rounded-[3px] border border-red-400/30 bg-red-500/10">
      <div className="text-[5px] font-semibold text-red-500">PDF</div>
    </div>
  );
}

/* ─── Main component ─── */

export function ModerationDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  const [scene, setScene] = useState<Scene>("extraction");
  const [cycle, setCycle] = useState(0);

  /* Extraction scene state */
  const [extractionSteps, setExtractionSteps] = useState<
    { active: boolean; complete: boolean }[]
  >([
    { active: false, complete: false },
    { active: false, complete: false },
    { active: false, complete: false },
  ]);

  /* Council scene state */
  const [teacherStates, setTeacherStates] = useState<
    ("waiting" | "active" | "done")[]
  >(["waiting", "waiting", "waiting", "waiting", "waiting"]);

  /* Published scene state */
  const [showBadges, setShowBadges] = useState(false);

  /* ─── Animation sequence ─── */

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const pause = (ms: number) =>
      new Promise<void>((res) => {
        setTimeout(res, ms);
      });

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setScene("extraction");
      setExtractionSteps([
        { active: false, complete: false },
        { active: false, complete: false },
        { active: false, complete: false },
      ]);
      setTeacherStates(["waiting", "waiting", "waiting", "waiting", "waiting"]);
      setShowBadges(false);

      await pause(600);
      if (cancelled) return;

      /* ── SCENE 1: Extraction ── */

      // Step 1: Text Extraction
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[0] = { active: true, complete: false };
        return next;
      });
      await pause(800);
      if (cancelled) return;
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[0] = { active: true, complete: true };
        return next;
      });
      await pause(400);
      if (cancelled) return;

      // Step 2: Image Classification
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[1] = { active: true, complete: false };
        return next;
      });
      await pause(800);
      if (cancelled) return;
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[1] = { active: true, complete: true };
        return next;
      });
      await pause(400);
      if (cancelled) return;

      // Step 3: Structure & Clean
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[2] = { active: true, complete: false };
        return next;
      });
      await pause(800);
      if (cancelled) return;
      setExtractionSteps((prev) => {
        const next = [...prev];
        next[2] = { active: true, complete: true };
        return next;
      });
      await pause(500);
      if (cancelled) return;

      /* ── SCENE 2: Council ── */
      setScene("council");
      await pause(500);
      if (cancelled) return;

      const teachers = [0, 1, 2, 3, 4];
      for (const i of teachers) {
        if (cancelled) return;
        setTeacherStates((prev) => {
          const next = [...prev];
          next[i] = "active";
          return next;
        });
        await pause(700);
        if (cancelled) return;
        setTeacherStates((prev) => {
          const next = [...prev];
          next[i] = "done";
          return next;
        });
        await pause(300);
      }

      await pause(400);
      if (cancelled) return;

      /* ── SCENE 3: Published ── */
      setScene("published");
      await pause(600);
      if (cancelled) return;
      setShowBadges(true);
      await pause(3000);
      if (cancelled) return;

      // Loop
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isInView, cycle]);

  /* ─── Teacher data ─── */

  const teachers = [
    { name: "Luna", role: "Creator", status: "Generated" },
    { name: "Atlas", role: "Reviewer", status: "Approved" },
    { name: "Nova", role: "Enricher", status: "Enhanced" },
    { name: "Sage", role: "Validator", status: "Verified" },
    { name: "Echo", role: "Fact Checker", status: "Confirmed" },
  ];

  const extractionLabels = [
    "Text Extraction",
    "Image Classification",
    "Structure & Clean",
  ];

  const contentTypes = ["Study Guide", "Flashcards", "Quiz", "Mock Exam"];

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

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Extraction ── */}
          {scene === "extraction" && (
            <motion.div
              key="extraction"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="relative z-10 flex w-full flex-col items-center pt-4">
                {/* File header */}
                <div className="flex flex-col items-center gap-2">
                  <PdfIcon />
                  <div className="text-center">
                    <div className="font-display text-[10px] font-light text-gray-900 dark:text-white">
                      midterm-notes.pdf
                    </div>
                    <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                      Extracting Content
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                <div className="my-3 h-[16px] w-px bg-gray-900/10 dark:bg-white/10" />

                {/* Extraction steps */}
                <div className="flex w-full max-w-[260px] flex-col gap-2 px-4">
                  {extractionLabels.map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.15, ease }}
                      className={`overflow-hidden rounded-lg border px-3 py-2 backdrop-blur-xl transition-all duration-300 ${
                        extractionSteps[i].complete
                          ? "border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
                          : extractionSteps[i].active
                            ? "border-[#5227FF]/30 bg-[#5227FF]/[0.03] dark:bg-[#5227FF]/[0.06]"
                            : "border-gray-900/10 bg-white/40 dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-medium text-gray-900 dark:text-white">
                          {label}
                        </span>
                        <div className="flex items-center">
                          {extractionSteps[i].complete ? (
                            <Checkmark />
                          ) : extractionSteps[i].active ? (
                            <Spinner />
                          ) : (
                            <div className="h-[10px] w-[10px] rounded-full border border-gray-900/10 dark:border-white/10" />
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar
                          active={extractionSteps[i].active}
                          complete={extractionSteps[i].complete}
                          delay={0}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 2: AI Council ── */}
          {scene === "council" && (
            <motion.div
              key="council"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="relative z-10 flex w-full flex-col items-center pt-3">
                {/* Header */}
                <div className="text-center">
                  <div className="font-display text-[11px] font-light text-gray-900 dark:text-white">
                    AI Teachers Council
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    5 Models Reviewing
                  </div>
                </div>

                {/* Separator */}
                <div className="mx-auto mt-2.5 h-px w-12 bg-gray-900/10 dark:bg-white/10" />

                {/* Teacher list */}
                <div className="mt-3 flex w-full max-w-[260px] flex-col gap-1.5 px-4">
                  {teachers.map((teacher, i) => (
                    <motion.div
                      key={teacher.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.08, ease }}
                      className={`flex items-center justify-between rounded-lg border px-3 py-[7px] backdrop-blur-xl transition-all duration-300 ${
                        teacherStates[i] === "done"
                          ? "border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
                          : teacherStates[i] === "active"
                            ? "border-[#5227FF]/40 bg-[#5227FF]/[0.04] dark:bg-[#5227FF]/[0.08]"
                            : "border-gray-900/10 bg-white/40 dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Teacher initial circle */}
                        <div
                          className={`flex h-[16px] w-[16px] items-center justify-center rounded-full text-[6px] font-semibold transition-colors duration-300 ${
                            teacherStates[i] === "done"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : teacherStates[i] === "active"
                                ? "bg-[#5227FF]/15 text-[#5227FF]"
                                : "bg-gray-900/5 text-gray-900/40 dark:bg-white/5 dark:text-white/40"
                          }`}
                        >
                          {teacher.name[0]}
                        </div>
                        <div className="text-center">
                          <span className="text-[8px] font-medium text-gray-900 dark:text-white">
                            {teacher.name}
                          </span>
                          <span className="ml-1 text-[6px] text-gray-900/40 dark:text-white/40">
                            {teacher.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {teacherStates[i] === "done" && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="text-[6px] font-medium text-emerald-600 dark:text-emerald-400"
                          >
                            {teacher.status}
                          </motion.span>
                        )}
                        {teacherStates[i] === "done" ? (
                          <Checkmark />
                        ) : teacherStates[i] === "active" ? (
                          <Spinner />
                        ) : (
                          <div className="h-[10px] w-[10px] rounded-full border border-gray-900/10 dark:border-white/10" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Scene 3: Published ── */}
          {scene === "published" && (
            <motion.div
              key="published"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="relative z-10 flex flex-col items-center">
                {/* Success circle */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-emerald-500/15"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 10L8.5 13.5L15 6.5"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2, ease }}
                  className="mt-3 text-center"
                >
                  <div className="font-display text-[13px] font-light text-gray-900 dark:text-white">
                    Content Published
                  </div>
                  <div className="mt-0.5 text-[7px] text-gray-900/40 dark:text-white/40">
                    Verified By 5 AI Teachers
                  </div>
                </motion.div>

                {/* Separator */}
                <div className="mx-auto mt-3 h-px w-10 bg-gray-900/10 dark:bg-white/10" />

                {/* Content type badges */}
                <AnimatePresence>
                  {showBadges && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, ease }}
                      className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
                    >
                      {contentTypes.map((type, i) => (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: i * 0.12,
                            ease,
                          }}
                          className="rounded-full border border-[#5227FF]/20 bg-[#5227FF]/[0.06] px-3 py-1 text-[7px] font-medium text-[#5227FF] dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10 dark:text-[#a78bfa]"
                        >
                          {type}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
