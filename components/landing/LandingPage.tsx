"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ReactLenis, useLenis } from "lenis/react";
import { GrainientButton } from "@/components/GrainientButton";
import { FeatureCard } from "@/components/FeatureCard";
import { useTranslation, type Locale } from "@/lib/i18n";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

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
      className="pointer-events-none absolute hidden select-none md:block"
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
  const [defs, setDefs] = useState(illustrations);

  useEffect(() => {
    // Shuffle illustrations on each page load for variety
    const shuffled = [...ILLU_SRCS].sort(() => Math.random() - 0.5).slice(0, illustrations.length);
    setDefs(generateSectionIllustrations(shuffled, Math.floor(Math.random() * 1000)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {defs.map((def, i) => (
        <FloatingIllustration key={`illu-${i}`} def={def} />
      ))}
    </>
  );
}

const STICKY_NOTES = [
  {
    image: `${CDN}/images/landing/sticky-grid.png`,
    textKey: "landing.stickyNote1",
    tilt: -3,
    font: "font-gochi",
  },
  {
    image: `${CDN}/images/landing/sticky-clip.png`,
    textKey: "landing.stickyNote2",
    tilt: 2,
    font: "font-delicious",
  },
  {
    image: `${CDN}/images/landing/sticky-lined.png`,
    textKey: "landing.stickyNote3",
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

/* ── Landing language switcher — hover dropdown (desktop), tap toggle (mobile) ── */
const LANG_OPTIONS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "fa", label: "FA" },
];

function LangSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = LANG_OPTIONS.find((l) => l.code === locale) || LANG_OPTIONS[0];
  const others = LANG_OPTIONS.filter((l) => l.code !== locale);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center px-2 py-1 pb-2 font-gochi text-[22px] text-white sm:px-3"
      >
        {current.label}
        <SketchUnderline visible={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 bottom-full z-50 mb-1 flex -translate-x-1/2 flex-col items-center gap-1 px-3 py-2"
          >
            {others.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code);
                  setOpen(false);
                }}
                className="w-full px-3 py-1 font-gochi text-[18px] text-white/60 transition-colors hover:text-white"
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const { t } = useTranslation();
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

    // Card animation — mid-section range for swaps
    const anim = clamp((progress - 0.18) / 0.5, 0, 1);
    // Draw path — complete by ~75% scroll so the circle is fully drawn
    // when it aligns with the sticky cards at viewport center
    const drawAnim = clamp(progress / 0.75, 0, 1);
    drawPath.update(easeInOutCubic(drawAnim));

    const spread = getSpread(getSpreadX());

    // Responsive arc size
    const w = window.innerWidth;
    const arcX = w < 640 ? 100 : w < 768 ? 140 : 190;
    const arcY = w < 640 ? 50 : 75;

    // 6 equal phases — each card gets equal dwell time on top
    const P = 1 / 6;

    cardEls.current.forEach((el, i) => {
      if (!el) return;

      let state: CardState;

      if (anim <= P) {
        // Phase 1: Spread → Stack (Card 2 on top)
        const t = smootherstep(anim / P);
        const slot = i === 2 ? SLOT_TOP : i === 1 ? SLOT_MID : SLOT_BOT;
        state = lerpState(spread[i], slot, t);
      } else if (anim <= 2 * P) {
        // Phase 2: Card 2 dwells on top
        state = i === 2 ? SLOT_TOP : i === 1 ? SLOT_MID : SLOT_BOT;
      } else if (anim <= 3 * P) {
        // Phase 3: Swap 1 — Card 0 arcs right → top
        const t = smootherstep((anim - 2 * P) / P);
        if (i === 0) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, 1);
        } else if (i === 2) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else if (anim <= 4 * P) {
        // Phase 4: Card 0 dwells on top
        state = i === 0 ? SLOT_TOP : i === 2 ? SLOT_MID : SLOT_BOT;
      } else if (anim <= 5 * P) {
        // Phase 5: Swap 2 — Card 1 arcs left → top
        const t = smootherstep((anim - 4 * P) / P);
        if (i === 1) {
          state = arcSwap(SLOT_BOT, SLOT_TOP, t, arcX, arcY, -1);
        } else if (i === 0) {
          state = lerpState(SLOT_TOP, SLOT_MID, t);
        } else {
          state = lerpState(SLOT_MID, SLOT_BOT, t);
        }
      } else {
        // Phase 6: Card 1 dwells / settled
        state = i === 1 ? SLOT_TOP : i === 0 ? SLOT_MID : SLOT_BOT;
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
      {/* Desktop — viewBox y-offset pushes paths down so the circle aligns with sticky cards */}
      <svg
        ref={(el) => { drawPath.register(el); }}
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 -300 1440 2400"
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
      {/* Mobile — same y-offset to match sticky card position */}
      <svg
        ref={(el) => { drawPath.register(el); }}
        className="pointer-events-none absolute inset-0 h-full w-full md:hidden"
        viewBox="0 -300 400 2400"
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
        {t("landing.beliefsTitle")}
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
            <div className={`absolute inset-0 flex items-center justify-center p-8 sm:p-7 md:p-9 ${i === 0 ? "pt-16 sm:pt-14 md:pt-18" : ""} ${i === 2 ? "pb-16 sm:pb-14 md:pb-18" : ""}`}>
              <p
                className={`whitespace-pre-line text-center text-lg leading-relaxed sm:text-xl md:text-2xl ${note.font}`}
                style={{ color: "rgb(60, 50, 40)" }}
              >
                {t(note.textKey)}
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
    numberKey: "landing.step1Number",
    titleKey: "landing.step1Title",
    descKey: "landing.step1Desc",
    font: "font-gochi",
  },
  {
    numberKey: "landing.step2Number",
    titleKey: "landing.step2Title",
    descKey: "landing.step2Desc",
    font: "font-delicious",
  },
  {
    numberKey: "landing.step3Number",
    titleKey: "landing.step3Title",
    descKey: "landing.step3Desc",
    font: "font-gochi",
  },
];

function HowItWorksSection() {
  const { t } = useTranslation();
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
          {t("landing.howItWorksTitle")}
        </motion.h2>

        <div className="flex flex-col items-center gap-12 sm:gap-16 md:gap-20">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.numberKey}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ duration: 0.7, ease, delay: i * 0.12 }}
              className="flex w-full max-w-lg flex-col items-center gap-4 text-center"
            >
              <span className="font-display text-6xl font-light text-[#5227FF] opacity-40 sm:text-7xl">
                {t(step.numberKey)}
              </span>
              <h3 className={`text-2xl text-foreground sm:text-3xl ${step.font}`}>
                {t(step.titleKey)}
              </h3>
              <p className="max-w-sm text-base leading-relaxed text-foreground/60 sm:text-lg">
                {t(step.descKey)}
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
    titleKey: "landing.mockExams",
    descKey: "landing.mockExamsDesc",
    font: "font-gochi",
  },
  {
    titleKey: "landing.studyGuides",
    descKey: "landing.studyGuidesDesc",
    font: "font-delicious",
  },
  {
    titleKey: "landing.presentations",
    descKey: "landing.presentationsDesc",
    font: "font-gochi",
  },
  {
    titleKey: "landing.professorRatings",
    descKey: "landing.professorRatingsDesc",
    font: "font-delicious",
  },
  {
    titleKey: "landing.progressTracking",
    descKey: "landing.progressTrackingDesc",
    font: "font-gochi",
  },
  {
    titleKey: "landing.communityDriven",
    descKey: "landing.communityDrivenDesc",
    font: "font-delicious",
  },
];

/* ── Pricing — ultra-wide banner with Grainient, between How It Works & Features ── */
function PricingSection() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Top fade — blends from the section above */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 sm:h-32"
        style={{
          background:
            "linear-gradient(to bottom, var(--background) 0%, transparent 100%)",
        }}
      />

      {/* Grainient background — full bleed */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Grainient
          className=""
          timeSpeed={0.4}
          grainAmount={0.06}
          contrast={1.2}
          saturation={0.7}
          zoom={0.5}
          warpSpeed={2.0}
          warpAmplitude={30}
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
        />
      </div>

      {/* Semi-transparent overlay for readability */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80" />

      {/* Content */}
      <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7, ease }}
          className="font-display text-3xl font-light text-foreground sm:text-4xl md:text-5xl"
        >
          {t("landing.pricingTitle")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="max-w-lg text-base leading-relaxed text-foreground/60 sm:text-lg"
        >
          {t("landing.pricingSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.2 }}
          className="flex items-baseline gap-1"
        >
          <span className="font-display text-6xl font-light text-foreground sm:text-7xl md:text-8xl">
            {t("landing.pricingPrice")}
          </span>
          <span className="text-lg text-foreground/40 sm:text-xl">
            {t("landing.pricingPeriod")}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.3 }}
          className="mt-2 flex items-center gap-2 text-sm text-foreground/40 sm:text-base"
        >
          <span>*</span>
          {t("landing.pricingNote")}
        </motion.p>
      </div>

      {/* Bottom fade — blends into the section below */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 sm:h-32"
        style={{
          background:
            "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />
    </section>
  );
}

function FeaturesSection() {
  const { t } = useTranslation();
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
          {t("landing.featuresTitle")}
        </motion.h2>

        <div className="grid auto-rows-[1fr] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard
              key={feature.titleKey}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              font={feature.font}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Community / About section ── */
function CommunitySection() {
  const { t } = useTranslation();
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
          {t("landing.communityTitle")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="max-w-xl text-base leading-relaxed text-foreground/60 sm:text-lg md:text-xl"
        >
          {t("landing.communityDesc1")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-5%" }}
          transition={{ duration: 0.7, ease, delay: 0.2 }}
          className="max-w-lg text-base leading-relaxed text-foreground/40 sm:text-lg"
        >
          {t("landing.communityDesc2")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: 0.3 }}
        >
          <GrainientButton href="/auth">
            {t("landing.getStarted")}
          </GrainientButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
      {/* Fade from solid background → transparent so Grainient bleeds through */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            var(--background) 0%,
            color-mix(in oklch, var(--background) 85%, transparent) 20%,
            color-mix(in oklch, var(--background) 55%, transparent) 45%,
            color-mix(in oklch, var(--background) 25%, transparent) 70%,
            transparent 100%
          )`,
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="font-display text-2xl font-light text-white sm:text-3xl">
            {t("landing.title")}
          </Link>
          <p className="font-gochi text-sm text-white/70 sm:text-base">
            {t("landing.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link href="/professors" className="text-sm text-white/80 transition-colors hover:text-white">
            {t("landing.rateYourProfessor")}
          </Link>
          <Link href="/privacy" className="text-sm text-white/80 transition-colors hover:text-white">
            {t("landing.privacyPolicy")}
          </Link>
          <Link href="/terms" className="text-sm text-white/80 transition-colors hover:text-white">
            {t("landing.termsOfUse")}
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <a
            href="mailto:hello@libraryyy.com"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            hello@libraryyy.com
          </a>
          <p className="text-xs text-white/50">
            &copy; {new Date().getFullYear()} {t("landing.title")}. {t("landing.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
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
          {/* ── Title + Motto — centered ── */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 sm:gap-8 md:gap-10">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease }}
              className="font-display text-7xl font-light tracking-tight text-white sm:text-9xl md:text-[10rem] lg:text-[11rem]"
            >
              {t("landing.title")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease, delay: 0.2 }}
              className="font-gochi text-xl text-white sm:text-2xl md:text-3xl"
            >
              {t("landing.subtitle")}
            </motion.p>
          </div>

          {/* ── Nav ── */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
            className="flex w-full items-center justify-center gap-2 px-6 pb-10 sm:gap-4 sm:px-10 sm:pb-14"
          >
            <NavLink href="/auth" font="delicious">
              {t("landing.letsStart")}
            </NavLink>
            <NavLink href="/portal" font="gochi">
              {t("landing.portal")}
            </NavLink>
            <LangSwitcher />
          </motion.nav>
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

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Features ── */}
      <FeaturesSection />

      {/* ── Community / About ── */}
      <CommunitySection />

      {/* ── Footer ── */}
      <Footer />
    </ReactLenis>
  );
}
