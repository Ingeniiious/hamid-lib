"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { COLORS, EASE } from "./landing-constants";

export function LandingNav() {
  const [plansOpen, setPlansOpen] = useState(false);

  const linkStyle = {
    color: COLORS.pink,
    fontFamily: "var(--font-gochi)",
    fontSize: 16,
  } as const;

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative z-50 flex items-center justify-between px-6 sm:px-10 pt-8 pb-4"
    >
      {/* Left nav item */}
      <Link
        href="#about"
        className="transition-opacity hover:opacity-70"
        style={linkStyle}
      >
        Student Community
      </Link>

      {/* Right nav items */}
      <div className="flex items-center gap-6">
        <Link
          href="/auth"
          className="transition-opacity hover:opacity-70"
          style={linkStyle}
        >
          Lets Start
        </Link>

        <div
          className="relative"
          onMouseEnter={() => setPlansOpen(true)}
          onMouseLeave={() => setPlansOpen(false)}
        >
          <button
            className="transition-opacity hover:opacity-70"
            style={linkStyle}
          >
            Plans
          </button>

          {plansOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="absolute top-full right-0 mt-2 flex flex-col items-center gap-1.5 rounded-xl px-5 py-3.5 backdrop-blur-xl"
              style={{ background: "rgba(23, 23, 23, 0.92)", minWidth: 180 }}
            >
              <p
                className="m-0 whitespace-nowrap text-lg"
                style={{
                  fontFamily: "var(--font-gochi)",
                  color: COLORS.pink,
                }}
              >
                Free Plan
              </p>
              <p
                className="m-0 whitespace-nowrap text-sm"
                style={{
                  fontFamily: "var(--font-gochi)",
                  color: COLORS.creamMuted,
                }}
              >
                Premium Plans Coming Soon
              </p>
            </motion.div>
          )}
        </div>

        <Link
          href="/dashboard/courses"
          className="transition-opacity hover:opacity-70"
          style={linkStyle}
        >
          Courses
        </Link>
      </div>
    </motion.nav>
  );
}
