"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Scene = "tiers" | "verify" | "badge";

/* ─── Shared components ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

/* ─── Main component ─── */

export function CoreContributorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  const [scene, setScene] = useState<Scene>("tiers");
  const [cycle, setCycle] = useState(0);

  /* Tier reveal state */
  const [visibleTiers, setVisibleTiers] = useState(0);
  const [glowContributor, setGlowContributor] = useState(false);

  /* Verify scene state */
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [showStats, setShowStats] = useState(false);

  /* Badge scene state */
  const [showBadge, setShowBadge] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

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

      setScene("tiers");
      setVisibleTiers(0);
      setGlowContributor(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setVerified(false);
      setShowStats(false);
      setShowBadge(false);
      setShowFeatures(false);

      await pause(500);
      if (cancelled) return;

      /* ── SCENE 1: Tiers ── */

      // Reveal tiers one by one
      setVisibleTiers(1); // Student
      await pause(400);
      if (cancelled) return;

      setVisibleTiers(2); // Contributor
      await pause(400);
      if (cancelled) return;

      setVisibleTiers(3); // Core Contributor
      await pause(600);
      if (cancelled) return;

      // Glow the contributor tier
      setGlowContributor(true);
      await pause(1600);
      if (cancelled) return;

      /* ── SCENE 2: Verify ── */
      setScene("verify");
      await pause(800);
      if (cancelled) return;

      // Type OTP digits one by one
      const digits = ["3", "8", "1", "5", "7", "2"];
      for (let i = 0; i < digits.length; i++) {
        if (cancelled) return;
        setOtpDigits((prev) => {
          const next = [...prev];
          next[i] = digits[i];
          return next;
        });
        await pause(180);
      }
      if (cancelled) return;
      await pause(500);

      // Show verified
      setVerified(true);
      await pause(600);
      if (cancelled) return;

      // Show stats
      setShowStats(true);
      await pause(1700);
      if (cancelled) return;

      /* ── SCENE 3: Badge ── */
      setScene("badge");
      await pause(600);
      if (cancelled) return;

      // Show badge
      setShowBadge(true);
      await pause(800);
      if (cancelled) return;

      // Show features
      setShowFeatures(true);
      await pause(2500);
      if (cancelled) return;

      // Loop
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
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
      <div className="relative z-10 h-[330px]">
        <DashboardGradient />

        <AnimatePresence mode="wait">
          {/* ── Scene 1: Tiers ── */}
          {scene === "tiers" && (
            <motion.div
              key="tiers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-10"
            >
              {/* Title */}
              <div className="mb-5 text-center font-display text-[13px] font-light text-gray-900 dark:text-white">
                Contributor Tiers
              </div>

              {/* Tier cards */}
              <div className="flex w-full max-w-[280px] flex-col items-center gap-2.5">
                {/* Student tier */}
                {visibleTiers >= 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="w-full rounded-xl border border-gray-900/15 bg-white/40 px-4 py-2.5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  >
                    <div className="text-center text-[10px] font-medium text-gray-900 dark:text-white">
                      Student
                    </div>
                    <div className="mt-0.5 text-center text-[7px] text-gray-900/50 dark:text-white/50">
                      Browse & Study
                    </div>
                  </motion.div>
                )}

                {/* Contributor tier */}
                {visibleTiers >= 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="relative w-full overflow-hidden rounded-xl border border-[#5227FF]/40 bg-white/40 px-4 py-2.5 backdrop-blur-xl dark:bg-white/10"
                  >
                    {/* Animated glow border */}
                    {glowContributor && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0] }}
                        transition={{ duration: 1.2, ease }}
                        className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_12px_rgba(82,39,255,0.3),0_0_16px_rgba(82,39,255,0.2)]"
                      />
                    )}
                    <div className="text-center text-[10px] font-medium text-[#5227FF] dark:text-[#a78bfa]">
                      Contributor
                    </div>
                    <div className="mt-0.5 text-center text-[7px] text-gray-900/50 dark:text-white/50">
                      Verify Email &rarr; Upload Materials
                    </div>
                  </motion.div>
                )}

                {/* Core Contributor tier */}
                {visibleTiers >= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="w-full rounded-xl border border-amber-400/50 bg-white/40 px-4 py-2.5 backdrop-blur-xl dark:border-amber-400/40 dark:bg-white/10"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="text-amber-500"
                      >
                        <path
                          d="M8 1l2.2 4.4L15 6.1l-3.5 3.4.8 4.9L8 12.2 3.7 14.4l.8-4.9L1 6.1l4.8-.7L8 1z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Core Contributor
                      </span>
                    </div>
                    <div className="mt-0.5 text-center text-[7px] text-gray-900/50 dark:text-white/50">
                      Priority Moderation &bull; Trusted Source
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Scene 2: Verify ── */}
          {scene === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex items-center justify-center px-8"
            >
              <div className="w-full max-w-[280px] rounded-xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                {/* Title */}
                <div className="text-center font-display text-[13px] font-light text-gray-900 dark:text-white">
                  Verify University Email
                </div>

                {/* Email field */}
                <div className="mt-3.5 flex h-[24px] items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-3 dark:border-white/20 dark:bg-white/10">
                  <span className="text-[8px] text-gray-900 dark:text-white">
                    sarah@mit.edu
                  </span>
                </div>

                {/* OTP code input */}
                <div className="mt-3 flex items-center justify-center">
                  <div className="flex items-center">
                    {otpDigits.map((digit, i) => (
                      <div
                        key={i}
                        className={`flex h-[26px] w-[26px] items-center justify-center border-y border-r text-[11px] font-medium text-gray-900 transition-colors duration-150 dark:text-white ${
                          i === 0 ? "rounded-l-md border-l" : ""
                        } ${i === 5 ? "rounded-r-md" : ""} ${
                          digit
                            ? "border-gray-900/20 bg-gray-900/5 dark:border-white/30 dark:bg-white/10"
                            : "border-gray-900/10 bg-gray-900/[0.02] dark:border-white/15 dark:bg-white/5"
                        }`}
                      >
                        {digit && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {digit}
                          </motion.span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verified state */}
                {verified && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="mt-3 flex items-center justify-center gap-1.5"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-emerald-500"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="7"
                        fill="currentColor"
                        fillOpacity="0.15"
                      />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                      Email Verified
                    </span>
                  </motion.div>
                )}

                {/* Stats card */}
                {showStats && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="mt-3 rounded-lg border border-gray-900/10 bg-gray-900/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="text-center text-[8px] text-gray-900/60 dark:text-white/60">
                      12 Contributions &bull; 92% Approved
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Scene 3: Badge ── */}
          {scene === "badge" && (
            <motion.div
              key="badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex items-center justify-center px-8"
            >
              <div className="w-full max-w-[280px] rounded-xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                {/* Badge */}
                {showBadge && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease }}
                    className="flex flex-col items-center"
                  >
                    {/* Gold badge icon */}
                    <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/10">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="text-amber-500"
                      >
                        <path
                          d="M8 1l2.2 4.4L15 6.1l-3.5 3.4.8 4.9L8 12.2 3.7 14.4l.8-4.9L1 6.1l4.8-.7L8 1z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>

                    {/* Badge label */}
                    <div className="mt-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-[3px]">
                      <span className="text-[8px] font-medium text-amber-600 dark:text-amber-400">
                        Core Contributor
                      </span>
                    </div>

                    {/* Name */}
                    <div className="mt-3 text-center font-display text-[13px] font-light text-gray-900 dark:text-white">
                      Prof. Sarah Johnson
                    </div>

                    {/* University */}
                    <div className="mt-0.5 text-center text-[8px] text-gray-900/50 dark:text-white/50">
                      MIT &mdash; Computer Science
                    </div>
                  </motion.div>
                )}

                {/* Feature pills */}
                {showFeatures && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
                  >
                    {[
                      "Priority Review",
                      "Direct Contribution",
                      "Trusted Source",
                    ].map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.4,
                          delay: i * 0.15,
                          ease,
                        }}
                        className="rounded-full border border-gray-900/10 bg-gray-900/5 px-2.5 py-[3px] dark:border-white/15 dark:bg-white/10"
                      >
                        <span className="text-[7px] text-gray-900/70 dark:text-white/70">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
