"use client";

import { motion } from "framer-motion";
import {
  COLORS,
  EASE,
  LAYOUT,
  MARQUEE_ITEMS,
  FOOTER_LINKS,
  DOODLES,
} from "./landing-constants";

function Marquee() {
  const track = MARQUEE_ITEMS.join("  \u2022  ") + "  \u2022  ";

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-lg landing-marquee-mask"
      style={{
        maxWidth: LAYOUT.marquee.maxWidth,
        height: LAYOUT.marquee.height,
      }}
    >
      {/* Scrolling track */}
      <div
        className="flex w-max whitespace-nowrap"
        style={{
          animation: `marquee ${LAYOUT.marquee.speed}s linear infinite`,
          fontFamily: "var(--font-gochi)",
          fontSize: 22,
          color: COLORS.cream,
          lineHeight: `${LAYOUT.marquee.height}px`,
        }}
      >
        <span className="shrink-0">{track}</span>
        <span className="shrink-0">{track}</span>
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative flex flex-col items-center px-4 pb-12 pt-8"
    >
      {/* Doodle decorations */}
      <div className="relative w-full max-w-[980px] mb-8">
        <img
          src={DOODLES.flowersRotated}
          alt=""
          className="absolute -left-[5%] -top-[60px] w-[140px] sm:w-[238px] hidden md:block opacity-70"
          style={{ transform: "rotate(-10deg)" }}
        />
        <img
          src={DOODLES.footerSlice}
          alt=""
          className="absolute -right-[3%] -top-[40px] w-[120px] sm:w-[191px] hidden md:block opacity-70"
        />
      </div>

      <Marquee />

      {/* Brand */}
      <p
        className="mt-4 font-display text-[30px] sm:text-[34px] font-light"
        style={{ color: COLORS.pink, letterSpacing: "-0.01em" }}
      >
        Libraryyy
      </p>

      {/* Links */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-3.5 gap-y-2">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[15px] sm:text-base transition-opacity hover:underline hover:opacity-80"
            style={{
              fontFamily: "var(--font-gochi)",
              color: COLORS.pink,
              opacity: 0.92,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </motion.footer>
  );
}
