"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  COLORS,
  EASE,
  LAYOUT,
  HERO_ILLUSTRATION,
  BOOK_DECO,
  BOOK_FOOTER_DECO,
  HERO_NOODLE,
  BELIEFS,
} from "./landing-constants";
import { useDoodleSlice } from "./useRandomDoodles";

/* ── Helpers ── */

function getTimezoneDisplay(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const offset = new Date().getTimezoneOffset();
  const absH = Math.floor(Math.abs(offset) / 60);
  const absM = Math.abs(offset) % 60;
  const sign = offset <= 0 ? "+" : "-";
  const gmtStr = `GMT ${sign}${absH}${absM ? `:${String(absM).padStart(2, "0")}` : ":00"}`;
  const city = tz.split("/").pop()?.replace(/_/g, " ") || "Your Campus";
  return `${city} \u2022 ${gmtStr}`;
}

/* ── Grid paper pattern (reusable inline style) ── */

const gridPaperStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(200,180,160,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(200,180,160,0.2) 1px, transparent 1px)",
  backgroundSize: `${LAYOUT.book.gridSpacing}px ${LAYOUT.book.gridSpacing}px`,
};

/* ── Sub-components ── */

function VerticalText({ word, delay }: { word: string; delay: number }) {
  return (
    <div className="flex flex-col items-center gap-0">
      {word.split("").map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: delay + i * 0.03 }}
          className="font-display text-[11px] leading-[1.3] sm:text-[13px]"
          style={{ color: COLORS.purple }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}

function RibbonLeft() {
  return (
    <svg
      className="absolute -left-6 top-[40%] w-[88px] -translate-y-1/2"
      viewBox="0 0 88.5 40.5"
      overflow="visible"
    >
      <path
        d="M 88.5 0 L 37.5 8 L 0 28.5 L 8.5 32.5 L 8.5 40.5 L 43 23 L 88.5 17 Z"
        fill={COLORS.purple}
      />
    </svg>
  );
}

function RibbonRight() {
  return (
    <svg
      className="absolute -right-4 top-[55%] h-[93px]"
      viewBox="0 0 46.5 93"
      overflow="visible"
    >
      <path
        d="M 0 23 L 41.5 52 L 46.5 72.5 L 23.5 85.5 L 0 93 L 0 75.5 L 18 69.5 L 28 62.5 L 21 21 L 0 0 Z"
        fill={COLORS.purple}
      />
    </svg>
  );
}

/* ── Sticky note data ── */

const STICKY_NOTES: {
  text: string;
  rotate: string;
  bg: string;
  lines: boolean;
}[] = [
  {
    text: BELIEFS[0],
    rotate: "-3deg",
    bg: "linear-gradient(135deg, #fff 60%, #e8ddd0)",
    lines: true,
  },
  {
    text: BELIEFS[1],
    rotate: "2deg",
    bg: "linear-gradient(135deg, #f0ead6 60%, #d4c5a9)",
    lines: false,
  },
  {
    text: BELIEFS[2],
    rotate: "-1deg",
    bg: "linear-gradient(135deg, #fff 50%, #e8ddd0)",
    lines: true,
  },
];

/* ── Main Component ── */

export function LandingHeroBook() {
  const [tz, setTz] = useState("");
  const doodles = useDoodleSlice(0);

  useEffect(() => {
    setTz(getTimezoneDisplay());
  }, []);

  return (
    <section className="relative flex flex-col items-center px-4 pb-4">
      {/* ── Floating Doodles (randomized, hidden on mobile) ── */}
      {doodles[0] && (
        <motion.img
          src={doodles[0]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
          className="pointer-events-none absolute left-[5%] top-[55%] hidden w-[80px] md:block sm:w-[104px]"
        />
      )}
      {doodles[1] && (
        <motion.img
          src={doodles[1]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 1.0 }}
          className="pointer-events-none absolute right-[8%] top-[60%] hidden w-[110px] md:block sm:w-[155px]"
        />
      )}
      {doodles[2] && (
        <motion.img
          src={doodles[2]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}
          className="pointer-events-none absolute right-[12%] top-[25%] hidden w-[90px] lg:block sm:w-[131px]"
        />
      )}

      {/* ── Book Container ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        className="relative mx-auto w-full"
        style={{ maxWidth: LAYOUT.book.desktopWidth }}
      >
        {/* ── Top Page ── */}
        {/* Gradient border wrapper */}
        <div
          className="relative overflow-hidden"
          style={{
            background: COLORS.bookBorder,
            borderRadius: `${LAYOUT.book.borderRadius}px ${LAYOUT.book.borderRadius}px 4px 4px`,
            padding: 2,
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
          }}
        >
          {/* Cream interior */}
          <div
            className="relative overflow-hidden bg-[rgb(242,227,207)] transition-colors duration-500 dark:bg-[rgb(35,30,25)]"
            style={{
              borderRadius: `${LAYOUT.book.borderRadius - 2}px ${LAYOUT.book.borderRadius - 2}px 2px 2px`,
              minHeight: 500,
            }}
          >
            {/* Grid paper pattern */}
            <div className="absolute inset-0" style={gridPaperStyle} />

            {/* Leather texture overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "rgba(180, 140, 100, 0.06)",
                mixBlendMode: "multiply",
                opacity: 0.54,
              }}
            />

            {/* Ribbons */}
            <RibbonLeft />
            <RibbonRight />

            {/* Content inside book */}
            <div className="relative z-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:p-10 md:p-14">
              {/* Left: text content */}
              <div className="min-w-0 flex-1">
                {/* Vertical text + name */}
                <div className="mb-2 flex items-start gap-3">
                  <div className="flex gap-[2px] pt-1">
                    <VerticalText word="Student" delay={0.4} />
                    <VerticalText word="Platform" delay={0.6} />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
                    className="text-lg sm:text-xl"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: COLORS.purple,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Libraryyy
                  </motion.p>
                </div>

                {/* Main heading */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
                  className="mt-2"
                >
                  <h1
                    className="text-[32px] font-light leading-[1.05] sm:text-[40px] md:text-[45px]"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: COLORS.purple,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Learning Should
                  </h1>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span
                      className="text-[32px] font-light leading-[1.05] sm:text-[40px] md:text-[45px]"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: COLORS.purple,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      feel
                    </span>
                    <span
                      className="text-[36px] leading-[1] sm:text-[44px] md:text-[51px]"
                      style={{
                        fontFamily: "var(--font-gochi)",
                        color: COLORS.purple,
                        fontStyle: "italic",
                      }}
                    >
                      natural
                    </span>
                  </div>
                </motion.div>

                {/* Timezone */}
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
                  className="mt-4 text-xs font-light sm:text-sm"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: COLORS.purple,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {tz}
                </motion.h3>

                {/* Small book decoration */}
                <motion.img
                  src={BOOK_DECO}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.7 }}
                  className="mt-4 w-[120px] opacity-60 sm:w-[180px]"
                />

                {/* Footer book decoration */}
                <motion.img
                  src={BOOK_FOOTER_DECO}
                  alt=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.75 }}
                  className="mt-2 w-[140px] opacity-50 sm:w-[228px]"
                />
              </div>

              {/* Right: hero illustration */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
                className="w-[200px] flex-shrink-0 sm:w-[300px] md:w-[420px] lg:w-[533px]"
              >
                <img
                  src={HERO_ILLUSTRATION}
                  alt="Student studying"
                  className="h-auto w-full"
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Pink Binder Bar ── */}
        <div
          className="mx-auto h-[40px] w-full sm:h-[63px]"
          style={{
            background: COLORS.bookBinder,
            borderRadius: 3,
          }}
        />

        {/* ── Bottom Page (3D Perspective) ── */}
        <div
          className="relative mx-auto overflow-hidden"
          style={{
            background: COLORS.bookBorder,
            borderRadius: `2px 2px ${LAYOUT.book.borderRadius}px ${LAYOUT.book.borderRadius}px`,
            padding: 2,
            width: "115%",
            marginLeft: "-7.5%",
            transform: "perspective(1200px) rotateX(25deg)",
            transformOrigin: "top center",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="relative bg-[rgb(242,227,207)] p-6 transition-colors duration-500 dark:bg-[rgb(35,30,25)] sm:p-10 md:p-14"
            style={{
              borderRadius: `0 0 ${LAYOUT.book.borderRadius - 2}px ${LAYOUT.book.borderRadius - 2}px`,
              minHeight: 200,
            }}
          >
            {/* Grid paper pattern */}
            <div className="absolute inset-0" style={gridPaperStyle} />

            {/* Leather texture overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "rgba(180, 140, 100, 0.06)",
                mixBlendMode: "multiply",
                opacity: 0.54,
              }}
            />

            {/* Beliefs subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative z-10 text-center text-sm sm:text-base"
              style={{
                fontFamily: "var(--font-gochi)",
                color: COLORS.purple,
              }}
            >
              3 Things We Believe In
            </motion.p>

            {/* Sticky notes */}
            <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
              {STICKY_NOTES.map((note, i) => (
                <motion.div
                  key={note.text}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    ease: EASE,
                    delay: 0.1 + i * 0.15,
                  }}
                  className="relative w-[180px] p-4 shadow-lg sm:w-[200px] sm:p-5"
                  style={{
                    background: note.bg,
                    transform: `rotate(${note.rotate})`,
                    borderRadius: 4,
                  }}
                >
                  {note.lines && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(transparent, transparent 23px, rgba(100,130,180,0.15) 23px, rgba(100,130,180,0.15) 24px)",
                      }}
                    />
                  )}
                  <p
                    className="relative z-10 text-lg leading-tight sm:text-xl"
                    style={{
                      fontFamily: "var(--font-gochi)",
                      color: COLORS.purple,
                    }}
                  >
                    {note.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
