"use client";

import { motion } from "framer-motion";
import { BackButton } from "@/components/BackButton";

const OUR_FONTS = [
  {
    name: "Geist (Current Sans)",
    className: "font-sans",
    english: "Libraryyy Helps Students Learn Faster.",
    turkish: "Libraryyy Ogrencilerin Daha Hizli Ogrenmesine Yardim Eder.",
    persian: "Libraryyy به دانشجویان کمک می‌کند سریع‌تر یاد بگیرند.",
  },
  {
    name: "Cooper BT (Current Display)",
    className: "font-display",
    english: "Libraryyy Helps Students Learn Faster.",
    turkish: "Libraryyy Ogrencilerin Daha Hizli Ogrenmesine Yardim Eder.",
    persian: "Libraryyy به دانشجویان کمک می‌کند سریع‌تر یاد بگیرند.",
  },
  {
    name: "SGKara (Current Persian)",
    className: "font-sgkara",
    english: "Libraryyy Helps Students Learn Faster.",
    turkish: "Libraryyy Ogrencilerin Daha Hizli Ogrenmesine Yardim Eder.",
    persian: "Libraryyy به دانشجویان کمک می‌کند سریع‌تر یاد بگیرند.",
  },
];

const JACKIE_FONTS = [
  {
    name: "Gochi Hand",
    className: "font-gochi",
    english: "Libraryyy Helps Students Learn Faster.",
    turkish: "Libraryyy Ogrencilerin Daha Hizli Ogrenmesine Yardim Eder.",
    persian: "Libraryyy به دانشجویان کمک می‌کند سریع‌تر یاد بگیرند.",
  },
  {
    name: "Delicious Handrawn",
    className: "font-delicious",
    english: "Libraryyy Helps Students Learn Faster.",
    turkish: "Libraryyy Ogrencilerin Daha Hizli Ogrenmesine Yardim Eder.",
    persian: "Libraryyy به دانشجویان کمک می‌کند سریع‌تر یاد بگیرند.",
  },
];

export default function FontComparePage() {
  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: "Delicious Handrawn";
          src: url("/fonts/DeliciousHandrawn-Regular.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "Gochi Hand";
          src: url("/fonts/GochiHand-Regular.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        .font-gochi {
          font-family: "Gochi Hand", "SGKara", cursive;
        }
        .font-delicious {
          font-family: "Delicious Handrawn", "SGKara", cursive;
        }
        .font-sgkara {
          font-family: "SGKara", "Geist", sans-serif;
        }
      `}</style>

      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 pb-24 pt-10 sm:pt-14">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease }}
          className="text-center"
        >
          <h1 className="font-display text-4xl font-light text-white sm:text-6xl">
            Font Comparison
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 sm:text-base">
            Your Current Fonts Vs Jackie Handwritten Fonts, Side By Side.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease, delay: 0.12 }}
            className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-7"
          >
            <h2 className="font-display text-2xl font-light text-white sm:text-3xl">
              Our Current Fonts
            </h2>
            <div className="mt-5 space-y-4">
              {OUR_FONTS.map((font, index) => (
                <motion.div
                  key={font.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease, delay: 0.2 + index * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <p className="mb-2 text-xs font-medium tracking-wide text-white/60">
                    {font.name}
                  </p>
                  <p className={`text-xl text-white sm:text-2xl ${font.className}`}>
                    {font.english}
                  </p>
                  <p className={`mt-2 text-base text-white/85 ${font.className}`}>
                    {font.turkish}
                  </p>
                  <p className={`mt-1 text-base text-white/85 ${font.className}`}>
                    {font.persian}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
            className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-7"
          >
            <h2 className="font-display text-2xl font-light text-white sm:text-3xl">
              Jackie Handwritten Fonts
            </h2>
            <div className="mt-5 space-y-4">
              {JACKIE_FONTS.map((font, index) => (
                <motion.div
                  key={font.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease, delay: 0.28 + index * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <p className="mb-2 text-xs font-medium tracking-wide text-white/60">
                    {font.name}
                  </p>
                  <p className={`text-2xl text-white sm:text-3xl ${font.className}`}>
                    {font.english}
                  </p>
                  <p className={`mt-2 text-lg text-white/90 ${font.className}`}>
                    {font.turkish}
                  </p>
                  <p className={`mt-1 text-lg text-white/90 ${font.className}`}>
                    {font.persian}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>

      <BackButton href="/" label="Home" floating />
    </>
  );
}
