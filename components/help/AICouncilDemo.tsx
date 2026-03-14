"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const appleEase = [0.22, 1, 0.36, 1] as const;
const R2 = "https://lib.thevibecodedcompany.com/images/teachers";

const TEACHERS = [
  { slug: "kimi", name: "Luna", creates: "Study Guides" },
  { slug: "chatgpt", name: "Atlas", creates: "Flashcards" },
  { slug: "claude", name: "Nova", creates: "Mock Exams" },
  { slug: "gemini", name: "Sage", creates: "Podcasts" },
  { slug: "grok", name: "Echo", creates: "Presentations" },
];

/* ─── Camera math ─── */

const PHOTO = 48;
const GAP = 6;
const W = 420; // container width
const ZOOM = 3.8;

// Center-X of each teacher in the row
const cx = (i: number) => {
  const totalRow = 5 * PHOTO + 4 * GAP;
  const start = (W - totalRow) / 2;
  return start + PHOTO / 2 + i * (PHOTO + GAP);
};

// Camera translation to center teacher i at given scale
const camFor = (i: number) => ({
  scale: ZOOM,
  x: (W / 2 - cx(i)) * ZOOM,
  y: 0,
});

/* ─── Components ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

export function AICouncilDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  /* Camera */
  const [cam, setCam] = useState({ scale: 1, x: 0, y: 0 });
  const [camDur, setCamDur] = useState(0);

  /* Which teacher is spotlighted (-1 = none, all visible) */
  const [activeIdx, setActiveIdx] = useState(-1);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const pause = (ms: number) =>
      new Promise<void>((res) => {
        setTimeout(res, ms);
      });

    const moveCam = (
      values: { scale: number; x: number; y: number },
      duration: number
    ) => {
      setCamDur(duration);
      setCam(values);
    };

    const run = async () => {
      /* Reset — zoom out, all visible */
      moveCam({ scale: 1, x: 0, y: 0 }, 0);
      setActiveIdx(-1);
      await pause(500);
      if (cancelled) return;

      /* Hold wide shot */
      await pause(2200);
      if (cancelled) return;

      /* Zoom into first teacher */
      setActiveIdx(0);
      moveCam(camFor(0), 1.6);
      await pause(3000);
      if (cancelled) return;

      /* Pan across teachers 1–4 */
      for (let i = 1; i < TEACHERS.length; i++) {
        if (cancelled) return;
        setActiveIdx(i);
        moveCam(camFor(i), 1.1);
        await pause(2600);
      }
      if (cancelled) return;

      /* Zoom back out */
      setActiveIdx(-1);
      moveCam({ scale: 1, x: 0, y: 0 }, 1.6);
      await pause(3000);
      if (cancelled) return;

      if (!cancelled) setCycle((c) => c + 1);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isInView, cycle]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl shadow-black/10"
    >
      {/* Grainient */}
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

        {/* ── Camera wrapper ── */}
        <motion.div
          animate={{ scale: cam.scale, x: cam.x, y: cam.y }}
          transition={{ duration: camDur, ease: appleEase }}
          style={{ transformOrigin: "center center" }}
          className="relative flex h-full items-center justify-center"
        >
          {/* Title — absolute so it doesn't push photos off-center */}
          <motion.div
            animate={{ opacity: activeIdx === -1 ? 1 : 0 }}
            transition={{ duration: 0.4, ease }}
            className="absolute inset-x-0 text-center font-display text-[16px] font-light text-gray-900 dark:text-white"
            style={{ bottom: "62%" }}
          >
            Meet Your Teachers
          </motion.div>

          {/* Teacher row — only photos in flow, naturally centered */}
          <div
            className="flex items-center justify-center"
            style={{ gap: GAP }}
          >
            {TEACHERS.map((t, i) => (
              <div
                key={t.slug}
                className="relative"
                style={{ width: PHOTO, height: PHOTO }}
              >
                <motion.img
                  src={`${R2}/${t.slug}.webp`}
                  alt={t.name}
                  animate={{
                    opacity:
                      activeIdx === -1 ? 1 : activeIdx === i ? 1 : 0,
                  }}
                  transition={{ duration: 0.5, ease }}
                  className="h-full w-full object-cover"
                />

                {/* Name — absolute above photo */}
                <motion.div
                  animate={{ opacity: activeIdx === i ? 1 : 0 }}
                  transition={{
                    duration: 0.4,
                    delay: activeIdx === i ? 0.3 : 0,
                    ease,
                  }}
                  className="absolute bottom-full left-1/2 flex -translate-x-1/2 flex-col items-center pb-[4px]"
                >
                  <div className="whitespace-nowrap font-display text-[6px] font-light text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                </motion.div>

                {/* Role — absolute below photo */}
                <motion.div
                  animate={{ opacity: activeIdx === i ? 1 : 0 }}
                  transition={{
                    duration: 0.4,
                    delay: activeIdx === i ? 0.3 : 0,
                    ease,
                  }}
                  className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center pt-[4px]"
                  style={{ top: PHOTO }}
                >
                  <div className="whitespace-nowrap text-[5px] text-gray-900/40 dark:text-white/40">
                    Creates Your {t.creates}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {/* Subtitle — absolute so it doesn't affect centering */}
          <motion.div
            animate={{ opacity: activeIdx === -1 ? 1 : 0 }}
            transition={{ duration: 0.4, ease }}
            className="absolute inset-x-0 text-center text-[11px] text-gray-900/40 dark:text-white/40"
            style={{ top: "65%" }}
          >
            5 Teachers, Each Creating Something Different
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
