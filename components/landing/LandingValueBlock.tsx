"use client";

import { motion } from "framer-motion";
import { COLORS, EASE, BELIEFS, RESTING_IMAGES, BELIEF_IMAGES, LAYOUT } from "./landing-constants";

// ── Resting section card positions ──
const RESTING_CARDS = [
  {
    src: RESTING_IMAGES.card1,
    width: 328,
    height: 255,
    style: { left: 0, top: 60, zIndex: 1 },
  },
  {
    src: RESTING_IMAGES.card2,
    width: 354,
    height: 262,
    style: { left: 140, top: 120, zIndex: 2 },
  },
  {
    src: RESTING_IMAGES.card3,
    width: 420,
    height: 363,
    style: { left: 230, top: 0, zIndex: 3 },
  },
] as const;

// ── Belief section configuration ──
type BeliefConfig = {
  title: string;
  images: {
    left: readonly string[];
    right: readonly string[];
    decoLeft: string;
    decoRight: string;
  };
  deco: {
    left: { src: string; width: number; height: number; position: "top" | "bottom" };
    right: { src: string; width: number; height: number; position: "top" | "bottom" };
  };
};

const BELIEF_SECTIONS: BeliefConfig[] = [
  {
    title: BELIEFS[0],
    images: BELIEF_IMAGES.belief1,
    deco: {
      left: { src: BELIEF_IMAGES.belief1.decoLeft, width: 144, height: 206, position: "top" },
      right: { src: BELIEF_IMAGES.belief1.decoRight, width: 251, height: 274, position: "bottom" },
    },
  },
  {
    title: BELIEFS[1],
    images: BELIEF_IMAGES.belief2,
    deco: {
      left: { src: BELIEF_IMAGES.belief2.decoLeft, width: 182, height: 181, position: "bottom" },
      right: { src: BELIEF_IMAGES.belief2.decoRight, width: 137, height: 290, position: "bottom" },
    },
  },
  {
    title: BELIEFS[2],
    images: BELIEF_IMAGES.belief3,
    deco: {
      left: { src: BELIEF_IMAGES.belief3.decoLeft, width: 78, height: 144, position: "bottom" },
      right: { src: BELIEF_IMAGES.belief3.decoRight, width: 204, height: 163, position: "bottom" },
    },
  },
];

// ── Shared card component ──
function ImageCard({
  src,
  delay = 0,
}: {
  src: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className="bg-white transition-colors duration-500 dark:bg-[rgb(35,35,35)]"
      style={{
        borderRadius: LAYOUT.valueBlock.cardBorderRadius,
        padding: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <img
        src={src}
        alt=""
        className="w-full h-auto rounded-[12px]"
        style={{ display: "block", objectFit: "cover" }}
      />
    </motion.div>
  );
}

// ── Resting section: 3 overlapping image cards ──
function RestingSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="flex justify-center"
    >
      {/* Desktop: overlapping layout */}
      <div
        className="relative hidden md:block"
        style={{ width: 670, height: 420 }}
      >
        {RESTING_CARDS.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.12 }}
            className="absolute"
            style={{
              left: card.style.left,
              top: card.style.top,
              zIndex: card.style.zIndex,
              width: card.width,
            }}
          >
            <div
              className="bg-white transition-colors duration-500 dark:bg-[rgb(35,35,35)]"
              style={{
                borderRadius: LAYOUT.valueBlock.cardBorderRadius,
                padding: 10,
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <img
                src={card.src}
                alt=""
                className="w-full rounded-[12px]"
                style={{
                  height: card.height - 20,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile: 2 cards side-by-side (compact) */}
      <div className="grid grid-cols-2 gap-3 px-4 md:hidden w-full max-w-[400px]">
        {RESTING_CARDS.slice(0, 2).map((card, i) => (
          <ImageCard key={i} src={card.src} delay={0.1 + i * 0.1} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Belief column: images + deco illustration ──
function BeliefColumn({
  cards,
  deco,
  side,
  baseDelay,
}: {
  cards: readonly string[];
  deco: BeliefConfig["deco"]["left"];
  side: "left" | "right";
  baseDelay: number;
}) {
  const isLeft = side === "left";

  return (
    <div
      className="relative flex flex-col gap-4"
      style={{ width: "100%" }}
    >
      {/* Deco illustration */}
      <motion.img
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE, delay: baseDelay + cards.length * 0.12 }}
        src={deco.src}
        alt=""
        className="absolute pointer-events-none hidden lg:block"
        style={{
          width: deco.width,
          height: deco.height,
          objectFit: "contain",
          [deco.position === "top" ? "top" : "bottom"]: -20,
          [isLeft ? "left" : "right"]: -40,
          zIndex: 0,
          opacity: 0.85,
        }}
      />

      {/* Image cards */}
      <div className="relative z-10 flex flex-col gap-4">
        {cards.map((src, i) => (
          <ImageCard key={i} src={src} delay={baseDelay + i * 0.12} />
        ))}
      </div>
    </div>
  );
}

// ── Belief section: left column + center title + right column ──
function BeliefSection({
  config,
  index,
}: {
  config: BeliefConfig;
  index: number;
}) {
  const baseDelay = 0.1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="w-full"
    >
      {/* Desktop: three-column layout */}
      <div className="hidden lg:flex items-stretch w-full" style={{ minHeight: 1040 }}>
        {/* Left column */}
        <div
          className="flex flex-col justify-center px-4"
          style={{ width: `${(LAYOUT.valueBlock.leftColWidth / (LAYOUT.valueBlock.leftColWidth + LAYOUT.valueBlock.middleSpacerWidth + LAYOUT.valueBlock.rightColWidth)) * 100}%` }}
        >
          <BeliefColumn
            cards={config.images.left}
            deco={config.deco.left}
            side="left"
            baseDelay={baseDelay}
          />
        </div>

        {/* Middle spacer with belief title */}
        <div
          className="flex items-center justify-center"
          style={{
            width: `${(LAYOUT.valueBlock.middleSpacerWidth / (LAYOUT.valueBlock.leftColWidth + LAYOUT.valueBlock.middleSpacerWidth + LAYOUT.valueBlock.rightColWidth)) * 100}%`,
          }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            className="text-center px-4"
            style={{
              fontFamily: "var(--font-gochi)",
              color: COLORS.pink,
              fontSize: 34,
              lineHeight: 1.3,
            }}
          >
            {config.title}
          </motion.p>
        </div>

        {/* Right column */}
        <div
          className="flex flex-col justify-center px-4"
          style={{ width: `${(LAYOUT.valueBlock.rightColWidth / (LAYOUT.valueBlock.leftColWidth + LAYOUT.valueBlock.middleSpacerWidth + LAYOUT.valueBlock.rightColWidth)) * 100}%` }}
        >
          <BeliefColumn
            cards={config.images.right}
            deco={config.deco.right}
            side="right"
            baseDelay={baseDelay + 0.15}
          />
        </div>
      </div>

      {/* Mobile: compact layout — only 2 images per belief so titles stay visible */}
      <div className="lg:hidden flex flex-col items-center gap-6 px-4">
        {/* Title first on mobile */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-center"
          style={{
            fontFamily: "var(--font-gochi)",
            color: COLORS.pink,
            fontSize: 26,
            lineHeight: 1.3,
          }}
        >
          {config.title}
        </motion.p>

        {/* 2 cards side-by-side (1 from each column) */}
        <div className="grid w-full max-w-[420px] grid-cols-2 gap-3">
          <ImageCard src={config.images.left[0]} delay={0.1} />
          <ImageCard src={config.images.right[0]} delay={0.18} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main export ──
export function LandingValueBlock() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Resting section */}
      <div className="py-12 sm:py-20">
        <RestingSection />
      </div>

      {/* Spacer */}
      <div style={{ height: 224 }} className="hidden md:block" />
      <div style={{ height: 32 }} className="md:hidden" />

      {/* Belief sections */}
      <div className="flex flex-col gap-8 lg:gap-0">
        {BELIEF_SECTIONS.map((config, i) => (
          <BeliefSection key={config.title} config={config} index={i} />
        ))}
      </div>
    </section>
  );
}
