"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  COLORS,
  EASE,
  LAYOUT,
  CHECKLIST_ITEMS,
  CHECKLIST_IMAGE,
} from "./landing-constants";
import { useDoodleSlice } from "./useRandomDoodles";

export function LandingChecklist() {
  const doodles = useDoodleSlice(3);

  return (
    <section
      id="about"
      className="relative flex flex-col items-center px-4 py-8 sm:py-16"
    >
      {/* Doodle: top-left outside card (randomized) */}
      {doodles[0] && (
        <img
          src={doodles[0]}
          alt=""
          className="absolute left-[5%] top-[10%] w-[100px] sm:w-[163px] hidden md:block opacity-70"
        />
      )}
      {/* Doodle: bottom-right outside card (randomized) */}
      {doodles[1] && (
        <img
          src={doodles[1]}
          alt=""
          className="absolute right-[5%] bottom-[10%] w-[120px] sm:w-[207px] hidden md:block opacity-70"
        />
      )}

      {/* Cream card */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10 w-full bg-[rgb(242,227,207)] dark:bg-[rgb(35,30,25)] p-8 transition-colors duration-500 sm:p-10"
        style={{
          maxWidth: LAYOUT.checklist.maxWidth,
          borderRadius: LAYOUT.checklist.borderRadius,
        }}
      >
        {/* Left: heading + checklist + CTA */}
        <div className="flex-1 flex flex-col">
          <h2
            className="text-2xl sm:text-[29px] leading-tight"
            style={{
              fontFamily: "var(--font-gochi)",
              color: COLORS.pink,
            }}
          >
            What We Build
          </h2>

          {/* Pink divider */}
          <div
            className="mt-2 mb-5 h-[2px] w-full"
            style={{ background: COLORS.pink }}
          />

          {/* Checklist items */}
          <ul className="space-y-3">
            {CHECKLIST_ITEMS.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: 0.2 + i * 0.1,
                }}
                className="flex items-center gap-3"
              >
                <span
                  className="inline-block h-4 w-4 rounded-sm border-2 shrink-0"
                  style={{ borderColor: COLORS.pink }}
                />
                <span
                  className="text-[20px] sm:text-[22px]"
                  style={{
                    fontFamily: "var(--font-gochi)",
                    color: COLORS.pink,
                  }}
                >
                  {item}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
            className="mt-5"
          >
            <Link
              href="/auth"
              className="inline-block rounded-full border-2 px-5 py-1.5 text-sm transition-opacity hover:opacity-70"
              style={{
                fontFamily: "var(--font-gochi)",
                borderColor: COLORS.pink,
                color: COLORS.pink,
              }}
            >
              Start Learning
            </Link>
          </motion.div>
        </div>

        {/* Right: image */}
        <div className="flex-shrink-0 w-full sm:w-[311px] overflow-hidden rounded-2xl">
          <img
            src={CHECKLIST_IMAGE}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>

      {/* Doodle below the card (randomized) */}
      {doodles[2] && (
        <motion.img
          src={doodles[2]}
          alt=""
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
          className="mt-8 w-[80px] sm:w-[121px] opacity-80"
        />
      )}
    </section>
  );
}
