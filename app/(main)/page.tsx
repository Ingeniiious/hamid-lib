"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ReactLenis, useLenis } from "lenis/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const CDN = "https://lib.thevibecodedcompany.com";

const STICKY_NOTES = [
  {
    image: `${CDN}/images/landing/sticky-grid.png`,
    text: "Your Notes Power The Community.",
    tilt: -3,
    font: "font-gochi",
  },
  {
    image: `${CDN}/images/landing/sticky-clip.png`,
    text: "Students Build, Students Learn.",
    tilt: 2,
    font: "font-delicious",
  },
  {
    image: `${CDN}/images/landing/sticky-lined.png`,
    text: "Practice Smarter, Score Higher.",
    tilt: -1.5,
    font: "font-gochi",
  },
] as const;

/* ── Math helpers for scroll-driven animation ── */
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  const v = clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
}

interface CardState {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
}

function lerpState(a: CardState, b: CardState, t: number): CardState {
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    rotate: lerpNum(a.rotate, b.rotate, t),
    scale: lerpNum(a.scale, b.scale, t),
    z: lerpNum(a.z, b.z, t),
  };
}

function getSpreadX(): number {
  if (typeof window === "undefined") return 310;
  const w = window.innerWidth;
  return w < 640 ? 50 : w < 768 ? 200 : 310;
}

function getSpread(spreadX: number): CardState[] {
  return [
    { x: -spreadX, y: 0, rotate: -3, scale: 1, z: 1 },
    { x: 0, y: 0, rotate: 2, scale: 1, z: 2 },
    { x: spreadX, y: 0, rotate: -1.5, scale: 1, z: 3 },
  ];
}

function applyCardTransform(
  el: HTMLDivElement,
  state: CardState,
  wx = 0,
  wy = 0,
  wr = 0,
) {
  el.style.transform = `translate(calc(-50% + ${(state.x + wx).toFixed(1)}px), calc(-50% + ${(state.y + wy).toFixed(1)}px)) scale(${state.scale.toFixed(3)}) rotate(${(state.rotate + wr).toFixed(1)}deg)`;
  el.style.zIndex = String(Math.round(state.z));
}

/* ── Hand-drawn underline that draws itself on hover ── */
function SketchUnderline({ visible }: { visible: boolean }) {
  const line1 = "M 2,4 C 30,6 70,2 100,5 C 130,8 170,3 198,5";
  const line2 = "M 4,7 C 35,4 65,9 100,6 C 135,3 165,8 196,5";
  // Shorter random scribbles underneath
  const line3 = "M 38,10 C 55,12 80,9 120,11 C 140,13 155,10 168,11";
  const line4 = "M 62,13 C 78,15 95,12 115,14 C 128,13 138,15 148,14";

  return (
    <svg
      className="pointer-events-none absolute bottom-0 left-0 w-full"
      viewBox="0 0 200 18"
      preserveAspectRatio="none"
      fill="none"
      style={{ height: 10 }}
    >
      <motion.path
        d={line1}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          visible
            ? { pathLength: 1, opacity: 0.7 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.35, ease }}
      />
      <motion.path
        d={line2}
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          visible
            ? { pathLength: 1, opacity: 0.35 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.3, ease, delay: visible ? 0.08 : 0 }}
      />
      <motion.path
        d={line3}
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          visible
            ? { pathLength: 1, opacity: 0.45 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.25, ease, delay: visible ? 0.14 : 0 }}
      />
      <motion.path
        d={line4}
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          visible
            ? { pathLength: 1, opacity: 0.3 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.2, ease, delay: visible ? 0.2 : 0 }}
      />
    </svg>
  );
}

/* ── Nav link with hover underline ── */
function NavLink({
  href,
  children,
  font,
}: {
  href: string;
  children: React.ReactNode;
  font: "gochi" | "delicious";
}) {
  const [hovered, setHovered] = useState(false);
  const fontClass = font === "gochi" ? "font-gochi" : "font-delicious";

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center px-2 py-1 pb-2 text-[22px] text-white sm:px-3 ${fontClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <SketchUnderline visible={hovered} />
    </Link>
  );
}

/*
 * Stack slots — named by layer position.
 * TOP is front-and-center, MID/BOT peek out slightly behind.
 */
const SLOT_TOP: CardState = { x: 0, y: 0, rotate: 1, scale: 1, z: 3 };
const SLOT_MID: CardState = { x: 8, y: 5, rotate: -2, scale: 1, z: 2 };
const SLOT_BOT: CardState = { x: -6, y: 9, rotate: 3, scale: 1, z: 1 };

/*
 * Arc swap — one card peels out from the stack, arcs over, and lands on top.
 * Z-index ramps gradually: starts at bottom (1), quickly rises past the
 * other cards as it clears the stack edge, stays above during flight,
 * then settles at top (3) when landing.
 */
function arcSwap(
  from: CardState,
  to: CardState,
  t: number,
  arcX: number,
  arcY: number,
  dir: number,
): CardState {
  const arc = Math.sin(t * Math.PI);

  // z stays at bottom until the card has physically cleared the stack
  // (~15% into the swap), then ramps up so it's fully above by ~40%.
  // This prevents the z-index pop while cards still overlap.
  const zUp = clamp((t - 0.15) * 4, 0, 1);
  const zDown = clamp((t - 0.85) / 0.15, 0, 1);
  const z = lerpNum(from.z, to.z + 1, zUp) - zDown;

  return {
    x: lerpNum(from.x, to.x, t) + arc * arcX * dir,
    y: lerpNum(from.y, to.y, t) - arc * arcY,
    rotate: lerpNum(from.rotate, to.rotate, t) + arc * 10 * dir,
    scale: lerpNum(from.scale, to.scale, t) + arc * 0.05,
    z,
  };
}

/* ── Sticky Notes with scroll-driven stacking ── */
function StickyNotesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);

  // Set initial spread positions on mount
  useEffect(() => {
    const spread = getSpread(getSpreadX());
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      applyCardTransform(el, spread[i]);
    });
  }, []);

  useLenis(() => {
    if (!sectionRef.current) return;

    const rect = sectionRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    const spread = getSpread(getSpreadX());

    // Responsive arc size
    const w = window.innerWidth;
    const arcX = w < 640 ? 100 : w < 768 ? 140 : 190;
    const arcY = w < 640 ? 50 : 75;

    // Animation range: starts at progress 0.18, spans 50% of total travel.
    // This gives reading time before stacking begins, and enough scroll
    // distance for each phase to feel deliberate.
    const anim = clamp((progress - 0.18) / 0.5, 0, 1);

    /*
     * Card ordering — matches spread z-order (Card 2 highest).
     *
     *   Spread:         Card 0 z=1,  Card 1 z=2,  Card 2 z=3
     *   Initial stack:  Card 0 = BOT, Card 1 = MID, Card 2 = TOP
     *   After swap 1:   Card 0 = TOP, Card 1 = BOT, Card 2 = MID
     *   After swap 2:   Card 1 = TOP, Card 0 = MID, Card 2 = BOT
     */

    cardEls.current.forEach((el, i) => {
      if (!el) return;

      let state: CardState;

      if (anim <= 0.25) {
        /* ── Phase 1: Spread → Stack ──
         * Cards converge preserving spread z-order:
         * Card 2 on top, Card 1 middle, Card 0 bottom.
         */
        const t = smoothstep(anim / 0.25);
        const slot = i === 2 ? SLOT_TOP : i === 1 ? SLOT_MID : SLOT_BOT;
        state = lerpState(spread[i], slot, t);
      } else if (anim <= 0.5) {
        /* ── Phase 2: Swap — Card 0 (bottom) peels out RIGHT → lands on top ──
         * Card 0 arcs right, z gradually rises.
         * Card 2 slides top → middle, Card 1 middle → bottom.
         */
        const t = smoothstep((anim - 0.25) / 0.25);

        if (i === 0) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, 1);
        } else if (i === 2) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else if (anim <= 0.75) {
        /* ── Phase 3: Swap — Card 1 (now bottom) peels out LEFT → lands on top ──
         * After phase 2: Card 0=TOP, Card 2=MID, Card 1=BOT
         */
        const t = smoothstep((anim - 0.5) / 0.25);

        if (i === 1) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, -1);
        } else if (i === 0) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else {
        /* ── Phase 4: Settled ──
         * Final: Card 1=TOP, Card 0=MID, Card 2=BOT
         */
        const slot = i === 1 ? SLOT_TOP : i === 0 ? SLOT_MID : SLOT_BOT;
        state = slot;
      }

      applyCardTransform(el, state);
    });
  });

  return (
    <section
      ref={sectionRef}
      className="relative h-[250vh] bg-[var(--background)]"
    >
      {/* Title — pins independently near the top */}
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, ease }}
        className="pb-[6vh] pt-[10vh] text-center font-display text-3xl font-light text-foreground sm:pb-[8vh] sm:pt-[8vh] sm:text-4xl md:text-5xl"
      >
        3 Things We Strongly Believe In
      </motion.h2>

      {/* Cards — pin below the title, only these animate */}
      <div
        className="sticky z-0 mx-auto w-full"
        style={{ height: 280, maxWidth: 1000, top: "calc(50vh - 140px)" }}
      >
        {STICKY_NOTES.map((note, i) => (
          <div
            key={i}
            ref={(el) => {
              cardEls.current[i] = el;
            }}
            className="absolute w-[240px] sm:w-[260px] md:w-[280px]"
            style={{
              left: "50%",
              top: "50%",
              willChange: "transform",
              transformStyle: "preserve-3d",
            }}
          >
            <img
              src={note.image}
              alt=""
              className="w-full"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-7 md:p-9">
              <p
                className={`text-center text-lg leading-relaxed sm:text-xl md:text-2xl ${note.font}`}
                style={{ color: "rgb(60, 50, 40)" }}
              >
                {note.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <ReactLenis
      className="h-full w-full overflow-y-auto"
      options={{
        lerp: 0.08,
        smoothWheel: true,
        wheelMultiplier: 0.8,
      }}
    >
      {/* ── Hero Section ── */}
      <section className="relative w-full">
        {/* Content — locked to first viewport */}
        <div className="relative flex h-dvh w-full flex-col items-center text-center">
          {/* ── Nav ── */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
            className="flex w-full items-center justify-center gap-2 px-6 pt-7 sm:gap-4 sm:px-10 sm:pt-9"
          >
            {/* Delicious Handrawn font — for comparison */}
            <NavLink href="/auth" font="delicious">
              Lets Start
            </NavLink>
            {/* Gochi Hand font — for comparison */}
            <NavLink href="/portal" font="gochi">
              Portal
            </NavLink>
          </motion.nav>

          {/* ── Title + Motto — centered ── */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 sm:gap-8 md:gap-10">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease }}
              className="font-display text-7xl font-light tracking-tight text-white sm:text-9xl md:text-[10rem] lg:text-[11rem]"
            >
              Libraryyy
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease, delay: 0.2 }}
              className="font-gochi text-xl text-white sm:text-2xl md:text-3xl"
            >
              By A Student, For A Student
            </motion.p>
          </div>
        </div>

        {/* Extra scroll space — the "leap" before the fade begins */}
        <div className="h-[35vh]" />

        {/* Fade-out gradient — eased multi-stop scrim */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[45vh]"
          style={{
            background: `linear-gradient(to bottom,
              transparent 0%,
              color-mix(in oklch, var(--background) 2%, transparent) 10%,
              color-mix(in oklch, var(--background) 6%, transparent) 20%,
              color-mix(in oklch, var(--background) 12%, transparent) 30%,
              color-mix(in oklch, var(--background) 22%, transparent) 40%,
              color-mix(in oklch, var(--background) 36%, transparent) 50%,
              color-mix(in oklch, var(--background) 54%, transparent) 60%,
              color-mix(in oklch, var(--background) 72%, transparent) 70%,
              color-mix(in oklch, var(--background) 88%, transparent) 80%,
              color-mix(in oklch, var(--background) 96%, transparent) 90%,
              var(--background) 100%
            )`,
          }}
        />
      </section>

      {/* ── Sticky Notes Section ── */}
      <StickyNotesSection />
    </ReactLenis>
  );
}
