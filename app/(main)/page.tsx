"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ReactLenis, useLenis } from "lenis/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const CDN = "https://lib.thevibecodedcompany.com";

/* ── Floating illustrations — distributed across sections ── */
// Seeded pseudo-random so positions are consistent across renders
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const ILLU_SRCS = [
  "pencil-writing-on-paper.webp",
  "graduation-cap.webp",
  "coffee-cup-with-steam.webp",
  "highlighter-marker.webp",
  "stack-of-textbooks.webp",
  "usb-flash-drive.webp",
  "headphones.webp",
  "laptop-with-a-smiling-screen.webp",
  "backpack-slightly-open-with-books-inside.webp",
  "open-notebook.webp",
  "bubble-tea-cup.webp",
  "camera.webp",
  "pizza-slice.webp",
  "skateboard.webp",
  "bicycle.webp",
  "instant-ramen-bowl.webp",
  "smartphone-with-chat-bubbles.webp",
  "tablet-with-a-stylus.webp",
  "paint-palette.webp",
  "sticky-note-with-a-small-heart-or-star.webp",
];

// Split illustrations into groups for each section
// Sticky notes: 5, How it works: 5, Features: 5, Community: 5
const SECTION_ILLU_GROUPS = [
  ILLU_SRCS.slice(0, 5),   // sticky notes
  ILLU_SRCS.slice(5, 10),  // how it works
  ILLU_SRCS.slice(10, 15), // features
  ILLU_SRCS.slice(15, 20), // community
];

type FloatingDef = {
  src: string;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
};

// Generate illustration defs for a section — bigger sizes, spread across the section
function generateSectionIllustrations(srcs: string[], seedOffset: number): FloatingDef[] {
  return srcs.map((src, i) => {
    const r = seededRandom(i + seedOffset);
    const isLeft = i % 2 === 0;
    const baseTop = 5 + (i / srcs.length) * 80 + r * 8;
    const edgeOffset = -2 + r * 8; // -2% to 6% from edge (can poke out)
    const size = 240 + Math.round(seededRandom(i + seedOffset + 50) * 100); // 240-340px
    const rotate = Math.round((seededRandom(i + seedOffset + 100) - 0.5) * 20);
    return {
      src,
      top: `${baseTop.toFixed(1)}%`,
      ...(isLeft ? { left: `${edgeOffset.toFixed(1)}%` } : { right: `${edgeOffset.toFixed(1)}%` }),
      size,
      rotate,
    };
  });
}

const STICKY_ILLUSTRATIONS = generateSectionIllustrations(SECTION_ILLU_GROUPS[0], 0);
const HOWITWORKS_ILLUSTRATIONS = generateSectionIllustrations(SECTION_ILLU_GROUPS[1], 100);
const FEATURES_ILLUSTRATIONS = generateSectionIllustrations(SECTION_ILLU_GROUPS[2], 200);
const COMMUNITY_ILLUSTRATIONS = generateSectionIllustrations(SECTION_ILLU_GROUPS[3], 300);

function FloatingIllustration({ def }: { def: FloatingDef }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={`${CDN}/images/landing/${def.src}`}
      alt=""
      draggable={false}
      loading="lazy"
      className="pointer-events-none absolute select-none"
      style={{
        top: def.top,
        left: def.left,
        right: def.right,
        width: `clamp(${Math.round(def.size * 0.5)}px, ${Math.round(def.size * 0.14)}vw, ${def.size}px)`,
        transform: `rotate(${def.rotate}deg)`,
        opacity: 0,
        transition: "opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}
    />
  );
}

function IllustrationLayer({ illustrations }: { illustrations: FloatingDef[] }) {
  return (
    <>
      {illustrations.map((def, i) => (
        <FloatingIllustration key={`illu-${def.src}`} def={def} />
      ))}
    </>
  );
}

const STICKY_NOTES = [
  {
    image: `${CDN}/images/landing/sticky-grid.png`,
    text: "Your Notes Power The Community.",
    tilt: -3,
    font: "font-gochi",
  },
  {
    image: `${CDN}/images/landing/sticky-clip.png`,
    text: "Students Build,\nStudents Learn.",
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

// Hermite smoothstep — zero velocity at both ends
function smoothstep(t: number) {
  const v = clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
}

// Quintic smoothstep — even smoother zero-accel at both ends (professional ramp)
function smootherstep(t: number) {
  const v = clamp(t, 0, 1);
  return v * v * v * (v * (v * 6 - 15) + 10);
}

// Ease-out cubic — fast start, gentle settle (for the "landing" feel)
function easeOutCubic(t: number) {
  const v = clamp(t, 0, 1);
  return 1 - (1 - v) * (1 - v) * (1 - v);
}

// Ease-in-out cubic — smooth accel & decel
function easeInOutCubic(t: number) {
  const v = clamp(t, 0, 1);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
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
  const zUp = smootherstep(clamp((t - 0.15) * 4, 0, 1));
  const zDown = smootherstep(clamp((t - 0.85) / 0.15, 0, 1));
  const z = lerpNum(from.z, to.z + 1, zUp) - zDown;

  return {
    x: lerpNum(from.x, to.x, t) + arc * arcX * dir,
    y: lerpNum(from.y, to.y, t) - arc * arcY,
    rotate: lerpNum(from.rotate, to.rotate, t) + arc * 10 * dir,
    scale: lerpNum(from.scale, to.scale, t) + arc * 0.05,
    z,
  };
}

/* ── Scroll-draw pencil path — realistic texture via SVG filter ── */
// Two overlapping strokes that wander down, exit the frame, come back,
// and finish by circling around the sticky-note stack at the center.
// feTurbulence + feDisplacementMap gives a real pencil-on-paper wobble.
// Desktop paths — viewBox 1440x2400. Cards centered at x=720, ~280px wide.
// Smooth S-curves along the sides, converge for a big circle around the notes.
const DESKTOP_LINES = [
  // Left line — enters off-screen, smooth flowing curves, hugs left side
  "M -60,400 C 80,520 260,560 180,720 C 100,880 -30,960 60,1120 " +
  "C 150,1280 300,1340 200,1480 C 100,1620 180,1680 350,1740 " +
  // Sweep to center → big circle
  "C 450,1780 500,1800 460,1860 " +
  "C 400,1940 500,1990 720,1990 C 940,1990 1040,1940 980,1860 " +
  "C 940,1810 840,1790 720,1790 C 600,1790 520,1820 540,1870 " +
  "C 560,1920 640,1950 720,1945",
  // Right line — wider swings, different rhythm, exits further right
  "M 1500,450 C 1380,580 1200,640 1300,800 C 1400,960 1520,1020 1400,1200 " +
  "C 1300,1380 1160,1420 1280,1540 C 1380,1660 1300,1720 1100,1760 " +
  // Sweep to center → circle, slightly offset
  "C 980,1790 930,1810 970,1870 " +
  "C 1030,1945 930,1995 720,1995 C 510,1995 410,1945 470,1870 " +
  "C 510,1820 610,1800 720,1800 C 830,1800 910,1830 890,1880 " +
  "C 870,1930 790,1955 720,1950",
];

// Mobile paths — viewBox 400x2400. Cards centered at x=200, ~240px wide.
// Cards visually at ~y=1760 in mobile SVG coords. Circle below at ~y=1900-2100.
const MOBILE_LINES = [
  // Left line — tight curves hugging the left edge
  "M -20,600 C 40,700 80,780 50,900 C 10,1020 -30,1120 20,1260 " +
  "C 60,1380 100,1480 60,1600 C 20,1720 50,1790 120,1830 " +
  // Circle below the notes — raised ~100 units
  "C 150,1860 130,1890 120,1930 " +
  "C 100,1990 140,2040 200,2040 C 260,2040 300,1990 280,1930 " +
  "C 265,1880 235,1860 200,1860 C 165,1860 140,1890 150,1930 " +
  "C 160,1960 180,1990 200,1985",
  // Right line — lazier swings, longer wavelength, distinctly different rhythm
  "M 420,700 C 390,860 360,960 380,1080 C 405,1220 430,1260 395,1420 " +
  "C 360,1560 320,1640 350,1720 C 375,1780 350,1810 290,1840 " +
  // Circle — offset
  "C 260,1865 275,1895 285,1935 " +
  "C 305,1995 265,2045 200,2045 C 135,2045 95,1995 115,1935 " +
  "C 130,1885 165,1865 200,1865 C 235,1865 265,1895 255,1935 " +
  "C 245,1965 220,1995 200,1990",
];

// Imperative update — called from useLenis, bypasses React.
// Handles both desktop & mobile SVGs — registers all paths from both.
function useDrawPathUpdate() {
  const allPaths = useRef<SVGPathElement[]>([]);
  const allLengths = useRef<number[]>([]);

  const register = useRef((svg: SVGSVGElement | null) => {
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path"));
    // Append to existing (first SVG registers, then second)
    allPaths.current = [...allPaths.current, ...paths];
    const lens = paths.map((p) => p.getTotalLength());
    allLengths.current = [...allLengths.current, ...lens];
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lens[i]}`;
      p.style.strokeDashoffset = `${lens[i]}`;
    });
  });

  const update = useRef((progress: number) => {
    allPaths.current.forEach((p, i) => {
      if (!allLengths.current[i]) return;
      p.style.strokeDashoffset = `${allLengths.current[i] * (1 - progress)}`;
    });
  });

  return { register: register.current, update: update.current };
}

/* ── Sticky Notes with scroll-driven stacking ── */
function StickyNotesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const drawPath = useDrawPathUpdate();

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

    // ── Timing — original values that sync SVG circle with card positions ──
    // Cards + draw both use the same range so the circle aligns with the sticky cards
    const anim = clamp((progress - 0.18) / 0.5, 0, 1);
    drawPath.update(easeInOutCubic(anim));

    const spread = getSpread(getSpreadX());

    // Responsive arc size
    const w = window.innerWidth;
    const arcX = w < 640 ? 100 : w < 768 ? 140 : 190;
    const arcY = w < 640 ? 50 : 75;

    cardEls.current.forEach((el, i) => {
      if (!el) return;

      let state: CardState;

      if (anim <= 0.25) {
        // Spread → Stack (smootherstep for zero-accel ramp)
        const t = smootherstep(anim / 0.25);
        const slot = i === 2 ? SLOT_TOP : i === 1 ? SLOT_MID : SLOT_BOT;
        state = lerpState(spread[i], slot, t);
      } else if (anim <= 0.5) {
        // Swap 1 — Card 0 arcs right → top
        const t = smootherstep((anim - 0.25) / 0.25);

        if (i === 0) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, 1);
        } else if (i === 2) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else if (anim <= 0.75) {
        // Swap 2 — Card 1 arcs left → top
        const t = smootherstep((anim - 0.5) / 0.25);

        if (i === 1) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, -1);
        } else if (i === 0) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else {
        // Settled — LOCKED, circle draws around them
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
      {/* Hand-drawn scroll paths — separate desktop/mobile for proper sizing */}
      {/* Desktop */}
      <svg
        ref={(el) => { drawPath.register(el); }}
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 1440 2400"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id="pencil-d" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {DESKTOP_LINES.map((d, i) => (
          <path key={i} d={d} stroke="currentColor" className="text-foreground"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#pencil-d)" />
        ))}
      </svg>
      {/* Mobile */}
      <svg
        ref={(el) => { drawPath.register(el); }}
        className="pointer-events-none absolute inset-0 h-full w-full md:hidden"
        viewBox="0 0 400 2400"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id="pencil-m" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {MOBILE_LINES.map((d, i) => (
          <path key={i} d={d} stroke="currentColor" className="text-foreground"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#pencil-m)" />
        ))}
      </svg>

      {/* Floating illustrations — scattered throughout this section */}
      <IllustrationLayer illustrations={STICKY_ILLUSTRATIONS} />

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
                className={`whitespace-pre-line text-center text-lg leading-relaxed sm:text-xl md:text-2xl ${note.font}`}
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

/* ── How It Works — three-step contribution flow ── */
const STEPS = [
  {
    number: "01",
    title: "Contribute",
    description: "Share your course notes, study guides, and exam materials from your university.",
    font: "font-gochi",
  },
  {
    number: "02",
    title: "Moderate",
    description: "Submissions are reviewed, cross-checked, and verified by the community.",
    font: "font-delicious",
  },
  {
    number: "03",
    title: "Learn",
    description: "Original study resources are created — examples, practices, and mock exams for everyone.",
    font: "font-gochi",
  },
];

function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] py-24 sm:py-32 md:py-40">
      <IllustrationLayer illustrations={HOWITWORKS_ILLUSTRATIONS} />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7, ease }}
          className="mb-16 text-center font-display text-3xl font-light text-foreground sm:mb-20 sm:text-4xl md:text-5xl"
        >
          How It Works
        </motion.h2>

        <div className="flex flex-col items-center gap-12 sm:gap-16 md:gap-20">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ duration: 0.7, ease, delay: i * 0.12 }}
              className="flex w-full max-w-lg flex-col items-center gap-4 text-center"
            >
              <span className="font-display text-6xl font-light text-[#5227FF] opacity-40 sm:text-7xl">
                {step.number}
              </span>
              <h3 className={`text-2xl text-foreground sm:text-3xl ${step.font}`}>
                {step.title}
              </h3>
              <p className="max-w-sm text-base leading-relaxed text-foreground/60 sm:text-lg">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Features — key platform features ── */
const FEATURES = [
  {
    title: "Mock Exams",
    description: "Practice with real-style exams, multiple versions, instant scoring.",
    font: "font-gochi",
  },
  {
    title: "Study Guides",
    description: "Structured content built from verified student contributions.",
    font: "font-delicious",
  },
  {
    title: "Presentations",
    description: "Class presentations toggled live by instructors, then yours forever.",
    font: "font-gochi",
  },
  {
    title: "Professor Ratings",
    description: "Anonymous, moderated reviews — know before you enroll.",
    font: "font-delicious",
  },
  {
    title: "Progress Tracking",
    description: "See your scores improve over time, course by course.",
    font: "font-gochi",
  },
  {
    title: "Community Driven",
    description: "Built by students, powered by the community — for everyone.",
    font: "font-delicious",
  },
];

function FeaturesSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] py-24 sm:py-32 md:py-40">
      <IllustrationLayer illustrations={FEATURES_ILLUSTRATIONS} />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7, ease }}
          className="mb-16 text-center font-display text-3xl font-light text-foreground sm:mb-20 sm:text-4xl md:text-5xl"
        >
          Everything You Need
        </motion.h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ duration: 0.6, ease, delay: i * 0.08 }}
              className="flex flex-col items-center gap-3 rounded-3xl border border-foreground/[0.06] bg-foreground/[0.02] px-6 py-8 text-center backdrop-blur-sm sm:px-8 sm:py-10"
            >
              <h3 className={`text-xl text-foreground sm:text-2xl ${feature.font}`}>
                {feature.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-foreground/50 sm:text-base">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Community / About section ── */
function CommunitySection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] py-24 sm:py-32 md:py-40">
      <IllustrationLayer illustrations={COMMUNITY_ILLUSTRATIONS} />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center sm:gap-12">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7, ease }}
          className="font-display text-3xl font-light text-foreground sm:text-4xl md:text-5xl"
        >
          Built By The Community
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="max-w-xl text-base leading-relaxed text-foreground/60 sm:text-lg md:text-xl"
        >
          Libraryyy is an open-source platform where students contribute, verify, and build
          study resources together. Every note you share helps someone else succeed.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.2 }}
          className="max-w-lg text-base leading-relaxed text-foreground/40 sm:text-lg"
        >
          Professors can become Core Contributors — verified educators who shape the
          study material directly. Students and professors, building the future of learning.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.3 }}
        >
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-full bg-[#5227FF] px-8 py-3 text-base font-medium text-white transition-opacity hover:opacity-90 sm:px-10 sm:py-4 sm:text-lg"
          >
            Join The Community
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06] bg-[var(--background)] py-12 sm:py-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <Link href="/" className="font-display text-2xl font-light text-foreground sm:text-3xl">
          Libraryyy
        </Link>
        <p className="font-gochi text-sm text-foreground/40 sm:text-base">
          By A Student, For A Student
        </p>
        <div className="flex items-center gap-6">
          <Link href="/auth" className="text-sm text-foreground/50 transition-colors hover:text-foreground sm:text-base">
            Get Started
          </Link>
          <Link href="/portal" className="text-sm text-foreground/50 transition-colors hover:text-foreground sm:text-base">
            Portal
          </Link>
        </div>
      </div>
    </footer>
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
            <NavLink href="/auth" font="delicious">
              Lets Start
            </NavLink>
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

      {/* ── How It Works ── */}
      <HowItWorksSection />

      {/* ── Features ── */}
      <FeaturesSection />

      {/* ── Community / About ── */}
      <CommunitySection />

      {/* ── Footer ── */}
      <Footer />
    </ReactLenis>
  );
}
