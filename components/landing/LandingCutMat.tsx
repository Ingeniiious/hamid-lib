"use client";

import { motion } from "framer-motion";
import {
  COLORS,
  EASE,
  LAYOUT,
  CUT_MAT_IMAGES,
  CUT_MAT_TEXTURE,
} from "./landing-constants";
import { useDoodleSlice } from "./useRandomDoodles";

export function LandingCutMat() {
  const doodles = useDoodleSlice(2);

  return (
    <section className="relative flex flex-col items-center px-4 py-8 sm:py-16">
      {/* Top decorations (randomized) */}
      <div className="relative w-full flex justify-center" style={{ maxWidth: LAYOUT.cutMat.maxWidth }}>
        {doodles[0] && (
          <motion.img
            src={doodles[0]}
            alt=""
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute left-[35%] -top-[20px] w-[80px] sm:w-[126px] hidden md:block opacity-80 z-10"
          />
        )}
        {doodles[1] && (
          <motion.img
            src={doodles[1]}
            alt=""
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="absolute left-[44%] -top-[60px] w-[160px] sm:w-[252px] hidden md:block opacity-80 z-10"
          />
        )}
      </div>

      {/* Dark cutting mat */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative w-full overflow-hidden bg-[rgb(28,28,28)] transition-colors duration-500 dark:bg-[rgb(18,18,18)]"
        style={{
          maxWidth: LAYOUT.cutMat.maxWidth,
          borderRadius: LAYOUT.cutMat.borderRadius,
        }}
      >
        {/* Mat texture background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${CUT_MAT_TEXTURE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.4,
          }}
        />

        <div className="relative z-10 flex p-5 sm:p-6">
          {/* Row numbers column */}
          <div className="hidden sm:flex flex-col pt-1 text-[10px] font-mono text-white/20 shrink-0 w-8 items-end pr-2">
            {Array.from({ length: 20 }, (_, i) => (
              <span
                key={i}
                style={{ lineHeight: `${LAYOUT.cutMat.gridSpacing}px` }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          {/* 3x3 image grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 flex-1">
            {CUT_MAT_IMAGES.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: 0.1 + i * 0.06,
                }}
                className="relative overflow-hidden rounded-md"
                style={{ aspectRatio: "4 / 3" }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
