"use client";

import { motion } from "framer-motion";
import {
  COLORS,
  EASE,
  LAYOUT,
  MARQUEE_ITEMS,
  FOOTER_LINKS,
} from "./landing-constants";
import { useDoodleSlice } from "./useRandomDoodles";

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
  const doodles = useDoodleSlice(4);

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative overflow-hidden flex flex-col items-center gap-6 px-4 pb-12 pt-16"
    >
      {/* Doodle decorations (randomized, contained within footer) */}
      {doodles[0] && (
        <img
          src={doodles[0]}
          alt=""
          className="absolute left-[5%] top-2 w-[100px] sm:w-[180px] hidden md:block opacity-40 pointer-events-none"
          style={{ transform: "rotate(-10deg)" }}
        />
      )}
      {doodles[1] && (
        <img
          src={doodles[1]}
          alt=""
          className="absolute right-[5%] top-4 w-[90px] sm:w-[150px] hidden md:block opacity-40 pointer-events-none"
        />
      )}

      <Marquee />

      {/* Brand */}
      <p
        className="font-display text-[30px] sm:text-[34px] font-light"
        style={{ color: COLORS.pink, letterSpacing: "-0.01em" }}
      >
        Libraryyy
      </p>

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[13px] sm:text-[14px] transition-opacity hover:opacity-70"
            style={{
              fontFamily: "var(--font-gochi)",
              color: COLORS.pink,
              opacity: 0.7,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Contact + Copyright */}
      <div className="flex flex-col items-center gap-1.5">
        <a
          href="mailto:hello@libraryyy.com"
          className="text-[12px] transition-opacity hover:opacity-70"
          style={{ color: COLORS.pink, opacity: 0.5 }}
        >
          hello@libraryyy.com
        </a>
        <p
          className="text-[11px]"
          style={{ color: COLORS.pink, opacity: 0.3 }}
        >
          &copy; {new Date().getFullYear()} Libraryyy. All Rights Reserved.
        </p>
      </div>
    </motion.footer>
  );
}
