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

function LangSwitcher({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = LANG_OPTIONS.find((l) => l.code === locale) || LANG_OPTIONS[0];
  const others = LANG_OPTIONS.filter((l) => l.code !== locale);

  const updateOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  // Use pointerType to distinguish mouse from touch — prevents
  // onMouseEnter (fires on tap) from conflicting with onClick toggle
  const handleEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updateOpen(true);
  };
  const handleLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    timeoutRef.current = setTimeout(() => updateOpen(false), 200);
  };

  return (
    <div
      className="relative inline-flex"
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <button
        onClick={() => updateOpen(!open)}
        className="relative inline-flex items-center px-2 py-1 pb-2 font-gochi text-[22px] text-white sm:px-3"
      >
        {current.label}
        <SketchUnderline visible={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-50 mt-1 flex -translate-x-1/2 flex-col items-center gap-1 px-3 py-2"
          >
            {others.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code);
                  updateOpen(false);
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

/* ── Lang switcher + doodle — wired together so dropdown open hides doodle ── */
function LangDoodle() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  return (
    <DoodleAnnotation config={LANG_DOODLE} childOpen={dropdownOpen}>
      <LangSwitcher onOpenChange={setDropdownOpen} />
    </DoodleAnnotation>
  );
}

/* ── Doodle annotation — reusable hand-drawn circle + arrow + text ── */
// 6 hand-drawn frames snap at ~4fps for stop-motion doodle wobble.
// Circles don't close perfectly (start ≠ end) for authentic hand-drawn feel.
// Arrow start matches arrowhead tip on every frame — always connected.

interface DoodleConfig {
  shapes: string[];
  arrows: string[];
  heads: string[];
  filledHead?: boolean;
  labels: string[];
  prefix: string;
  svgPos: React.CSSProperties;
  scaleOrigin: string;
  textPos: React.CSSProperties;
  delay: number;
  mobileScale?: string; // Tailwind scale class, default "scale-[0.65]"
}

const FILTER_SEEDS = [42, 17, 89, 63, 31, 55];

// Language picker — smaller circle + SE arrow, circle at (60,24)
const LANG_DOODLE: DoodleConfig = {
  shapes: [
    "M 24,24 C 22,12 36,2 60,2 C 84,2 98,12 100,24 C 102,36 88,44 62,44 C 36,44 26,36 24,28",
    "M 28,22 C 22,8 40,0 62,2 C 84,4 100,12 98,26 C 96,38 82,46 58,44 C 34,42 30,34 28,26",
    "M 22,26 C 26,12 38,4 60,2 C 82,0 100,10 102,24 C 104,36 90,46 64,46 C 38,46 20,38 22,30",
    "M 26,24 C 20,10 40,0 58,2 C 80,4 102,12 100,26 C 98,38 84,48 60,46 C 34,44 28,34 26,28",
    "M 22,28 C 24,14 36,2 56,2 C 80,2 98,10 102,24 C 106,36 90,44 64,42 C 38,42 20,36 22,32",
    "M 28,24 C 22,8 42,2 62,4 C 84,6 100,14 96,28 C 92,40 78,44 56,42 C 34,40 30,32 28,28",
  ],
  arrows: [
    "M 84,42 C 96,54 110,68 122,80 C 132,92 140,102 148,110",
    "M 82,40 C 94,52 108,70 124,84 C 134,92 142,104 150,112",
    "M 86,42 C 98,56 112,68 122,82 C 130,94 138,106 146,114",
    "M 83,41 C 95,53 106,64 120,78 C 130,88 142,100 152,108",
    "M 85,43 C 99,57 114,70 126,84 C 136,96 144,108 148,116",
    "M 84,40 C 96,52 104,72 118,86 C 128,96 136,106 144,112",
  ],
  heads: [
    "M 87,56 L 84,42 L 98,45",
    "M 85,54 L 82,40 L 96,43",
    "M 89,56 L 86,42 L 100,45",
    "M 86,55 L 83,41 L 97,44",
    "M 88,57 L 85,43 L 99,46",
    "M 87,54 L 84,40 L 98,43",
  ],
  mobileScale: "scale-[0.75]",
  labels: ["Choose Your Language", "Dilini Buradan Seç", "زبانت رو انتخاب کن"],
  prefix: "dl",
  svgPos: { left: "50%", top: "50%", transform: "translate(-60px, -24px)" },
  scaleOrigin: "60px 24px",
  textPos: { top: "118px", left: "148px", transform: "translateX(-50%)" },
  delay: 3.5,
};

// "Let's Start" button — hand-drawn rectangle + bent arrow with filled head
// Rectangle centered at (180,24), arrow bends down then left (elbow shape)
const START_DOODLE: DoodleConfig = {
  shapes: [
    "M 124,2 C 152,-1 206,-2 232,2 C 236,14 237,32 234,46 C 208,49 152,50 122,47 C 119,34 118,14 124,2",
    "M 126,0 C 154,-3 204,0 230,4 C 234,16 236,34 232,48 C 204,51 150,52 120,48 C 117,36 116,16 126,4",
    "M 122,4 C 150,1 208,-4 234,0 C 238,12 239,30 236,44 C 210,47 154,48 124,46 C 121,32 120,12 122,4",
    "M 128,2 C 156,-2 202,-1 228,3 C 232,14 234,34 230,48 C 202,50 148,52 118,48 C 116,36 114,14 128,6",
    "M 120,4 C 148,0 210,-2 236,2 C 240,16 238,32 234,46 C 206,50 154,50 126,46 C 122,34 122,14 120,4",
    "M 126,0 C 152,-2 208,0 232,4 C 236,12 238,30 234,44 C 208,48 150,50 122,48 C 118,34 120,12 126,4",
  ],
  arrows: [
    // Elbow-bent: straight-ish down, then bends left
    "M 156,60 C 158,70 160,78 160,86 C 158,94 146,100 130,106 C 114,112 98,116 84,118",
    "M 158,62 C 160,72 162,80 162,88 C 160,96 148,102 132,108 C 118,114 100,118 86,120",
    "M 154,60 C 156,68 158,76 158,84 C 156,92 142,98 126,104 C 110,110 96,114 82,116",
    "M 157,61 C 160,72 163,80 161,88 C 158,94 150,100 134,106 C 120,112 102,116 88,118",
    "M 155,60 C 156,70 158,78 156,86 C 154,92 140,100 122,106 C 106,112 92,116 78,118",
    "M 158,62 C 162,74 164,80 162,90 C 160,96 148,102 130,108 C 112,114 98,118 84,120",
  ],
  heads: [
    // Filled triangles (closed with Z) — tip at arrow/rect junction, opening downward
    "M 148,62 L 156,48 L 164,60 Z",
    "M 150,64 L 158,50 L 166,62 Z",
    "M 146,62 L 154,48 L 162,60 Z",
    "M 149,63 L 157,49 L 165,61 Z",
    "M 147,62 L 155,48 L 163,60 Z",
    "M 150,64 L 158,50 L 166,62 Z",
  ],
  filledHead: true,
  mobileScale: "scale-[0.85]",
  labels: ["Start Here", "Buradan Başla", "از اینجا شروع کن"],
  prefix: "ds",
  svgPos: { left: "50%", top: "50%", transform: "translate(-180px, -24px)" },
  scaleOrigin: "180px 24px",
  textPos: { top: "122px", left: "84px", transform: "translateX(-50%)" },
  delay: 2,
};

function DoodleAnnotation({
  children,
  config,
  childOpen,
}: {
  children: React.ReactNode;
  config: DoodleConfig;
  childOpen?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [textIdx, setTextIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), config.delay * 1000);
    return () => clearTimeout(timer);
  }, [config.delay]);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 6), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setTextIdx((i) => (i + 1) % config.labels.length),
      5000,
    );
    return () => clearInterval(id);
  }, [config.labels.length]);

  // Desktop: hover to hide doodle
  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 300);
  };

  // Hide on hover (desktop) OR when child dropdown is open (mobile)
  const active = hovered || !!childOpen;
  const show = visible && !active;
  const { prefix } = config;

  return (
    <div
      className="relative -m-4 inline-flex p-4"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <motion.div
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: show ? 0.5 : 0.25, ease }}
        className="pointer-events-none absolute"
        style={config.svgPos}
      >
        <div
          className={`${config.mobileScale ?? "scale-[0.65]"} sm:scale-100`}
          style={{ transformOrigin: config.scaleOrigin }}
        >
          <svg
            width={240}
            height={130}
            viewBox="0 0 240 130"
            fill="none"
            className="overflow-visible"
          >
            <defs>
              {FILTER_SEEDS.map((seed, i) => (
                <filter
                  key={i}
                  id={`${prefix}-f${i}`}
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.6"
                    numOctaves={3}
                    seed={seed}
                    result="n"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="n"
                    scale={1.5}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              ))}
            </defs>
            <g filter={`url(#${prefix}-f${frame})`} opacity="0.85">
              <path
                d={config.shapes[frame]}
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={config.arrows[frame]}
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={config.heads[frame]}
                stroke="white"
                strokeWidth={config.filledHead ? "1.5" : "2"}
                fill={config.filledHead ? "white" : "none"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="absolute" style={config.textPos}>
            <AnimatePresence mode="wait">
              <motion.span
                key={textIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease }}
                className="block whitespace-nowrap text-center font-gochi text-lg text-white"
              >
                {config.labels[textIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {children}
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
    // Draw path — uses the raw progress across the full 250vh section.
    // Square root easing makes the first half draw slower (most visible),
    // then speeds up toward the end when the circle forms.
    drawPath.update(Math.sqrt(progress));

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

/* ── Doodle marker highlight — zigzag draw-in then stop-motion wobble ── */
// 6 messy zigzag marker strokes that fill behind the text like a highlighter.
// Phase 1: pathLength draws the zigzag in. Phase 2: wobbles between frames.
const HIGHLIGHT_FRAMES = [
  // Vertical zigzag — messy scribble overshooting edges, uneven spacing
  "M -6,8 L -2,30 L 8,0 L 14,36 L 22,6 L 30,34 L 38,-2 L 44,38 L 54,8 L 58,32 L 68,2 L 76,36 L 82,6 L 90,34 L 96,-2 L 102,38 L 108,10",
  "M -4,4 L 0,34 L 10,8 L 16,38 L 28,2 L 32,30 L 42,6 L 46,36 L 56,0 L 62,34 L 70,8 L 78,38 L 86,2 L 92,32 L 100,6 L 106,36 L 108,8",
  "M -8,10 L -2,36 L 6,2 L 12,32 L 24,8 L 28,38 L 36,0 L 44,34 L 52,6 L 60,38 L 66,2 L 74,30 L 84,8 L 88,36 L 98,0 L 104,34 L 110,6",
  "M -4,6 L 2,32 L 10,-2 L 18,36 L 26,4 L 34,38 L 40,2 L 48,32 L 58,8 L 64,36 L 72,0 L 78,34 L 88,6 L 94,38 L 100,2 L 108,34 L 106,8",
  "M -6,2 L 0,36 L 8,6 L 16,34 L 22,0 L 30,38 L 38,4 L 46,30 L 54,2 L 60,36 L 68,6 L 76,32 L 86,0 L 90,38 L 98,4 L 106,32 L 108,4",
  "M -4,8 L -2,34 L 6,0 L 14,38 L 24,4 L 32,32 L 40,8 L 46,38 L 56,2 L 62,30 L 72,6 L 78,36 L 84,0 L 92,34 L 100,8 L 104,36 L 110,10",
];

function DoodleHighlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [drawn, setDrawn] = useState(false);
  const [frame, setFrame] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Trigger when scrolled into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // After draw-in completes, start the wobble loop
  useEffect(() => {
    if (!drawn) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 6), 600);
    return () => clearInterval(id);
  }, [drawn]);

  return (
    <span ref={ref} className={`relative inline-block ${className ?? ""}`}>
      {/* Highlight SVG behind the text */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id="hl-pencil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.5"
              numOctaves={3}
              seed="77"
              result="n"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale={2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        {drawn ? (
          // Phase 2: wobble between frames
          <path
            d={HIGHLIGHT_FRAMES[frame]}
            stroke="#5227FF"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.2"
            filter="url(#hl-pencil)"
          />
        ) : (
          // Phase 1: draw-in zigzag
          <motion.path
            d={HIGHLIGHT_FRAMES[0]}
            stroke="#5227FF"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.2"
            filter="url(#hl-pencil)"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            onAnimationComplete={() => {
              if (inView) setDrawn(true);
            }}
          />
        )}
      </svg>

      {/* Text on top */}
      <span className="relative z-10">{children}</span>
    </span>
  );
}

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
          <DoodleHighlight>{t("landing.howItWorksTitle")}</DoodleHighlight>
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

/* ── Doodle underline — hand-drawn lines that draw beneath a title ── */
const UNDERLINE_FRAMES = [
  // Two wobbly lines stacked — messy emphasis strokes
  "M -4,6 C 15,4 35,8 50,5 C 65,2 85,7 104,5",
  "M -2,8 C 18,5 32,9 50,6 C 68,3 82,8 102,6",
  "M -6,6 C 12,3 38,8 52,5 C 66,2 88,7 106,4",
  "M -4,7 C 16,4 30,8 48,5 C 64,2 84,8 104,6",
  "M -2,5 C 14,3 36,8 50,6 C 66,3 86,7 102,4",
  "M -6,8 C 18,5 34,9 52,6 C 70,3 82,8 106,6",
];
const UNDERLINE_FRAMES_2 = [
  "M -2,12 C 20,10 40,14 55,11 C 70,8 85,13 102,11",
  "M -4,14 C 16,11 38,15 52,12 C 68,9 88,14 104,12",
  "M 0,12 C 22,10 36,14 50,11 C 66,8 82,14 100,11",
  "M -2,13 C 18,10 42,14 56,11 C 72,8 84,13 104,11",
  "M -4,12 C 14,10 34,15 50,12 C 68,9 86,13 102,12",
  "M 0,14 C 20,11 40,15 54,12 C 70,9 80,14 100,12",
];

function DoodleUnderlineTitle({
  children,
  exclamation,
}: {
  children: React.ReactNode;
  exclamation?: boolean;
}) {
  const { locale } = useTranslation();
  const [drawn, setDrawn] = useState(false);
  const [frame, setFrame] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!drawn) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 6), 600);
    return () => clearInterval(id);
  }, [drawn]);

  // Persian/Arabic → exclamation on the left, everything else → right
  const isRTL = locale === "fa";

  return (
    <span ref={ref} className="relative inline-block">
      {/* Doodle exclamation mark — locale-aware, animated wobble */}
      {exclamation && (
        <span
          className={`pointer-events-none absolute top-[0.05em] bottom-0 ${isRTL ? "-left-[0.5em]" : "-right-[0.5em]"}`}
        >
          <svg
            className="h-[1em] w-auto overflow-visible"
            viewBox="0 0 14 36"
            fill="none"
          >
            <defs>
              <filter id="ex-pencil" x="-20%" y="-10%" width="140%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={3} seed={FILTER_SEEDS[frame]} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <g filter="url(#ex-pencil)">
              {/* Teardrop — wide at top, tapers to a point at bottom */}
              {[
                "M 3,2 C 2,4 1,8 2,14 C 3,20 5,24 7,28 C 9,24 11,20 12,14 C 13,8 12,4 11,2 C 9,0 5,0 3,2 Z",
                "M 4,2 C 2,5 0,9 1,14 C 2,20 5,25 7,28 C 10,24 12,19 13,14 C 14,9 12,5 10,2 C 8,0 6,0 4,2 Z",
                "M 2,2 C 1,4 0,8 1,14 C 3,21 6,25 7,28 C 8,24 11,20 12,14 C 13,8 13,4 12,2 C 10,0 4,0 2,2 Z",
                "M 4,2 C 3,5 1,9 2,14 C 3,20 6,24 7,28 C 9,25 11,20 12,14 C 14,9 13,5 11,2 C 9,0 5,0 4,2 Z",
                "M 3,2 C 1,4 0,8 1,14 C 2,20 5,24 7,28 C 10,25 12,20 13,14 C 14,8 12,4 10,2 C 8,0 5,0 3,2 Z",
                "M 2,2 C 2,5 1,9 2,14 C 4,21 6,25 7,28 C 8,24 10,19 12,14 C 13,9 13,5 12,2 C 10,0 4,0 2,2 Z",
              ].map((d, i) => i === frame && (
                <path key={i} d={d} fill="currentColor" className="text-[#5227FF] dark:text-white" opacity="0.5" />
              ))}
              {/* Round dot */}
              {[
                "M 5,32 C 4,31 4,34 5,35 C 7,36 9,36 9,34 C 10,32 8,31 7,31 C 6,31 5,31 5,32 Z",
                "M 5,33 C 4,32 3,34 5,35 C 7,36 10,36 10,34 C 10,32 8,31 7,31 C 6,31 5,32 5,33 Z",
                "M 4,32 C 4,31 3,34 5,35 C 7,37 9,36 10,34 C 10,32 9,31 7,31 C 5,31 4,31 4,32 Z",
                "M 5,32 C 4,31 4,34 6,35 C 8,36 10,35 10,34 C 10,32 8,31 7,31 C 6,31 5,32 5,32 Z",
                "M 4,33 C 4,32 3,34 5,36 C 7,36 9,36 10,34 C 10,32 9,31 7,31 C 5,31 4,32 4,33 Z",
                "M 5,32 C 4,31 3,34 5,35 C 7,37 10,36 10,34 C 10,32 8,31 7,31 C 6,31 5,31 5,32 Z",
              ].map((d, i) => i === frame && (
                <path key={i} d={d} fill="currentColor" className="text-[#5227FF] dark:text-white" opacity="0.5" />
              ))}
            </g>
          </svg>
        </span>
      )}

      {children}

      {/* Underline SVG below the text */}
      <svg
        className="pointer-events-none absolute -bottom-4 left-0 w-full overflow-visible sm:-bottom-5"
        style={{ height: 18 }}
        viewBox="0 0 100 18"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id="ul-pencil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.5"
              numOctaves={3}
              seed="33"
              result="n"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale={1.5}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        {drawn ? (
          <>
            <path
              d={UNDERLINE_FRAMES[frame]}
              stroke="currentColor"
              className="text-[#5227FF] dark:text-white"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
              filter="url(#ul-pencil)"
            />
            <path
              d={UNDERLINE_FRAMES_2[frame]}
              stroke="currentColor"
              className="text-[#5227FF] dark:text-white"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.3"
              filter="url(#ul-pencil)"
            />
          </>
        ) : (
          <>
            <motion.path
              d={UNDERLINE_FRAMES[0]}
              stroke="currentColor"
              className="text-[#5227FF] dark:text-white"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
              filter="url(#ul-pencil)"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            <motion.path
              d={UNDERLINE_FRAMES_2[0]}
              stroke="currentColor"
              className="text-[#5227FF] dark:text-white"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.3"
              filter="url(#ul-pencil)"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              onAnimationComplete={() => {
                if (inView) setDrawn(true);
              }}
            />
          </>
        )}
      </svg>
    </span>
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
          <DoodleUnderlineTitle exclamation>
            {t("landing.featuresTitle")}
          </DoodleUnderlineTitle>
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
/* ── Doodle heart — single hand-drawn heart at the end of title ── */
// Classic heart shape using proper SVG heart bezier curves.
// 6 wobble frames with pencil texture filter.
// Hand-drawn heart: asymmetric lobes, imperfect closure, sketchy feel.
// 10 frames for more variety at fast wobble speed.
const DOODLE_HEART_FRAMES = [
  "M 10,19 C 8,16 1,12 1,7 C 1,3 3,1 6,1 C 8,1 10,3 10,5 C 10,3 12,1 14,1 C 17,1 19,3 19,7 C 19,12 12,16 10,19",
  "M 10,18 C 7,15 2,12 2,7 C 2,3 4,0 7,0 C 9,0 10,2 10,4 C 10,2 12,0 14,0 C 17,0 18,3 18,7 C 18,12 13,15 11,18",
  "M 10,19 C 8,17 0,12 0,7 C 0,2 3,0 6,0 C 8,0 10,2 10,4 C 10,2 11,0 14,0 C 17,0 20,2 20,7 C 20,12 12,17 10,19",
  "M 10,18 C 7,16 1,11 1,7 C 1,3 4,1 7,1 C 9,1 10,3 10,5 C 10,3 12,1 14,1 C 16,1 19,3 19,7 C 19,11 13,16 11,18",
  "M 10,19 C 8,16 2,13 2,7 C 2,2 4,0 6,0 C 8,0 10,2 10,4 C 10,2 11,0 14,0 C 17,0 18,2 18,7 C 18,13 12,16 10,19",
  "M 10,18 C 7,15 0,12 0,7 C 0,3 3,1 7,1 C 9,1 10,3 10,5 C 10,3 12,1 14,1 C 17,1 20,3 20,7 C 20,12 13,15 11,18",
  "M 10,19 C 9,17 1,13 1,8 C 1,3 4,0 6,0 C 8,0 10,2 10,4 C 10,2 12,0 14,0 C 16,0 19,3 19,8 C 19,13 11,17 10,19",
  "M 10,18 C 7,16 2,11 2,7 C 2,2 5,1 7,1 C 9,1 10,3 10,5 C 10,3 11,1 13,1 C 16,1 18,2 18,7 C 18,11 13,16 11,18",
  "M 10,19 C 8,16 0,13 0,7 C 0,3 3,0 7,0 C 9,0 10,2 10,4 C 10,2 12,0 14,0 C 17,0 20,3 20,7 C 20,13 12,16 10,19",
  "M 10,18 C 7,15 1,12 1,8 C 1,4 4,1 6,1 C 8,1 10,3 10,5 C 10,3 12,1 14,1 C 17,1 19,4 19,8 C 19,12 13,15 11,18",
];

function DoodleHeart() {
  const [frame, setFrame] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 10), 250);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <motion.svg
      ref={ref}
      className="ml-2 inline-block overflow-visible align-middle sm:ml-3"
      style={{ width: "0.8em", height: "0.8em", marginBottom: "0.05em" }}
      viewBox="0 0 20 20"
      fill="none"
      initial={{ opacity: 0, scale: 0 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease }}
    >
      <defs>
        <filter id="heart-pencil" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={3} seed={FILTER_SEEDS[frame % FILTER_SEEDS.length]} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <path
        d={DOODLE_HEART_FRAMES[frame]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#heart-pencil)"
        className="text-[#5227FF] dark:text-[#8B6FFF]"
        opacity="0.85"
      />
    </motion.svg>
  );
}

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
          {t("landing.communityTitle")}<DoodleHeart />
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
          <Link href="/help" className="text-sm text-white/80 transition-colors hover:text-white">
            {t("landing.helpCenter")}
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

            {/* ── Nav ── */}
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease, delay: 0.3 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <DoodleAnnotation config={START_DOODLE}>
                <NavLink href="/auth" font="delicious">
                  {t("landing.letsStart")}
                </NavLink>
              </DoodleAnnotation>
              <NavLink href="/portal" font="gochi">
                {t("landing.portal")}
              </NavLink>
              <LangDoodle />
            </motion.nav>
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
