"use client";

import { useRef, useState, useEffect, useCallback, forwardRef } from "react";
import { motion } from "framer-motion";
import HTMLFlipBook from "react-pageflip";
import { COLORS, EASE, BOOK_PAGES, DOODLES } from "./landing-constants";
import { useDoodleSlice } from "./useRandomDoodles";

// ── Page wrapper — react-pageflip requires forwardRef div children ──

const BookPage = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; style?: React.CSSProperties }
>(function BookPage({ children, className, style }, ref) {
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
});

// ── Main component ──

export function LandingBook() {
  const bookRef = useRef<any>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const totalPages = BOOK_PAGES.length;
  const lastScrollY = useRef(0);
  const isFlipping = useRef(false);
  const doodles = useDoodleSlice(1);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll-driven page flipping
  useEffect(() => {
    if (!isMounted) return;

    const section = sectionRef.current;
    if (!section) return;

    let cooldown = false;

    const handleWheel = (e: WheelEvent) => {
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;

      if (!inView || cooldown || isFlipping.current) return;

      const book = bookRef.current?.pageFlip();
      if (!book) return;

      const current = book.getCurrentPageIndex();
      const delta = e.deltaY;

      if (delta > 30 && current < totalPages - 1) {
        e.preventDefault();
        isFlipping.current = true;
        cooldown = true;
        book.flipNext();
        setTimeout(() => {
          cooldown = false;
          isFlipping.current = false;
        }, 800);
      } else if (delta < -30 && current > 0) {
        e.preventDefault();
        isFlipping.current = true;
        cooldown = true;
        book.flipPrev();
        setTimeout(() => {
          cooldown = false;
          isFlipping.current = false;
        }, 800);
      }
    };

    // Use passive: false so we can preventDefault
    section.addEventListener("wheel", handleWheel, { passive: false });
    return () => section.removeEventListener("wheel", handleWheel);
  }, [isMounted, totalPages]);

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative flex flex-col items-center px-4 py-16 sm:py-24"
    >
      {/* Section heading */}
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mb-2 text-center text-3xl sm:text-4xl"
        style={{
          fontFamily: "var(--font-gochi)",
          color: COLORS.pink,
        }}
      >
        How It Works
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        className="mb-10 text-center text-sm sm:text-base"
        style={{ color: COLORS.creamMuted }}
      >
        Flip through the pages
      </motion.p>

      {/* Doodle decorations (randomized) */}
      {doodles[0] && (
        <img
          src={doodles[0]}
          alt=""
          className="absolute left-[4%] top-[15%] hidden w-[80px] opacity-60 md:block sm:w-[120px]"
        />
      )}
      {doodles[1] && (
        <img
          src={doodles[1]}
          alt=""
          className="absolute right-[4%] bottom-[12%] hidden w-[90px] opacity-60 md:block sm:w-[140px]"
        />
      )}

      {/* Book container */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative"
      >
        {isMounted && (
          <HTMLFlipBook
            ref={bookRef}
            width={400}
            height={500}
            minWidth={280}
            maxWidth={500}
            minHeight={350}
            maxHeight={620}
            size="stretch"
            showCover={false}
            usePortrait={true}
            startPage={0}
            drawShadow={true}
            maxShadowOpacity={0.3}
            flippingTime={600}
            mobileScrollSupport={false}
            clickEventForward={false}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            startZIndex={0}
            autoSize={true}
            onFlip={onFlip}
            className=""
            style={{}}
          >
            {/* Cover page */}
            <BookPage
              className="flex flex-col items-center justify-center overflow-hidden rounded-r-lg bg-[rgb(242,227,207)] transition-colors duration-500 dark:bg-[rgb(35,30,25)]"
            >
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <p
                  className="text-lg sm:text-xl"
                  style={{
                    fontFamily: "var(--font-gochi)",
                    color: COLORS.pink,
                    opacity: 0.5,
                  }}
                >
                  Hamid Library
                </p>
                <h3
                  className="mt-3 text-2xl sm:text-3xl"
                  style={{
                    fontFamily: "var(--font-gochi)",
                    color: COLORS.pink,
                  }}
                >
                  How It Works
                </h3>
                <div
                  className="mx-auto mt-4 h-[2px] w-24"
                  style={{ background: COLORS.pink }}
                />
                <p
                  className="mt-4 text-xs text-[rgb(60,50,40)] transition-colors duration-500 dark:text-[rgb(200,185,170)] sm:text-sm"
                  style={{ opacity: 0.6 }}
                >
                  Flip to explore →
                </p>
              </div>
            </BookPage>

            {/* Content pages */}
            {BOOK_PAGES.map((page, i) => (
              <BookPage
                key={i}
                className="flex flex-col overflow-hidden rounded-r-lg bg-[rgb(242,227,207)] transition-colors duration-500 dark:bg-[rgb(35,30,25)]"
              >
                <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
                  {/* Illustration */}
                  <div className="mb-5 flex w-full max-w-[240px] items-center justify-center sm:max-w-[280px]">
                    <img
                      src={page.illustration}
                      alt={page.title}
                      className="h-auto w-full object-contain"
                      draggable={false}
                    />
                  </div>

                  {/* Step number */}
                  <span
                    className="text-xs tracking-widest uppercase"
                    style={{ color: COLORS.pink, opacity: 0.6 }}
                  >
                    Step {i + 1}
                  </span>

                  {/* Title */}
                  <h3
                    className="mt-2 text-xl sm:text-2xl"
                    style={{
                      fontFamily: "var(--font-gochi)",
                      color: COLORS.pink,
                    }}
                  >
                    {page.title}
                  </h3>

                  {/* Body */}
                  <p
                    className="mt-3 max-w-[280px] text-xs leading-relaxed text-[rgb(60,50,40)] transition-colors duration-500 dark:text-[rgb(200,185,170)] sm:text-sm"
                    style={{ opacity: 0.7 }}
                  >
                    {page.body}
                  </p>

                  {/* Page number */}
                  <span
                    className="mt-auto pt-4 text-[10px] text-[rgb(60,50,40)] transition-colors duration-500 dark:text-[rgb(200,185,170)]"
                    style={{ opacity: 0.3 }}
                  >
                    {i + 1} / {totalPages}
                  </span>
                </div>
              </BookPage>
            ))}

            {/* Back cover */}
            <BookPage
              className="flex flex-col items-center justify-center overflow-hidden rounded-r-lg bg-[rgb(242,227,207)] transition-colors duration-500 dark:bg-[rgb(35,30,25)]"
            >
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <img
                  src={DOODLES.computer}
                  alt=""
                  className="mb-4 w-16 opacity-60"
                  draggable={false}
                />
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "var(--font-gochi)",
                    color: COLORS.pink,
                    opacity: 0.5,
                  }}
                >
                  Ready to start?
                </p>
              </div>
            </BookPage>
          </HTMLFlipBook>
        )}
      </motion.div>

      {/* Page dots indicator */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {Array.from({ length: totalPages + 2 }, (_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: currentPage === i ? 1.3 : 1,
              opacity: currentPage === i ? 1 : 0.3,
            }}
            transition={{ duration: 0.3, ease: EASE }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: COLORS.pink }}
          />
        ))}
      </div>
    </section>
  );
}
