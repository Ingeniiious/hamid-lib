"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;
const appleEase = [0.22, 1, 0.36, 1] as const;
const R2 = "https://lib.thevibecodedcompany.com";
const CHROME_H = 21;
const VIEWPORT_H = 330;
const VIEWPORT_W = 420;

/* ─── Helpers ─── */

function getElPos(
  el: HTMLElement | null,
  container: HTMLElement | null
): { x: number; y: number } {
  if (!el || !container) return { x: 0, y: 0 };
  let x = el.offsetLeft + el.offsetWidth / 2;
  let y = el.offsetTop + el.offsetHeight / 2;
  let parent = el.offsetParent as HTMLElement | null;
  while (parent && parent !== container) {
    x += parent.offsetLeft;
    y += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/* ─── Language data ─── */

type Lang = "en" | "tr" | "fa";

const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "tr", label: "Türkçe", short: "TR" },
  { code: "fa", label: "فارسی", short: "فا" },
];

const dashLabels: Record<
  Lang,
  { greeting: string; studies: string; space: string; courses: string }
> = {
  en: { greeting: "Good Morning, Sarah", studies: "My Studies", space: "My Space", courses: "Courses" },
  tr: { greeting: "Günaydın, Sarah", studies: "Çalışmalarım", space: "Alanım", courses: "Dersler" },
  fa: { greeting: "صبح بخیر، سارا", studies: "مطالعات من", space: "فضای من", courses: "دروس" },
};

/* ─── DashboardGradient (same as BrowseDemo) ─── */

function DashboardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />
  );
}

/* ─── Mini Sun icon (matches Phosphor Sun duotone) ─── */

function MiniSun() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <circle cx="9" cy="9" r="3.5" fill="currentColor" opacity="0.2" />
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1="9"
          y1="2"
          x2="9"
          y2="3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${a} 9 9)`}
        />
      ))}
    </svg>
  );
}

/* ─── Mini Moon icon (matches Phosphor Moon duotone) ─── */

function MiniMoon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <path
        d="M14 10.5A5.5 5.5 0 017.5 4a5.5 5.5 0 106.5 6.5z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Main component ─── */

export function PersonalizeDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs */
  const langPickerRef = useRef<HTMLDivElement>(null);
  const themeToggleRef = useRef<HTMLDivElement>(null);
  const dropdownItemRefs = useRef<Record<Lang, HTMLDivElement | null>>({
    en: null,
    tr: null,
    fa: null,
  });

  /* Camera state — { scale, x, y } with transform origin 0 0 */
  const [cam, setCam] = useState({ scale: 1, x: 0, y: 0 });
  const [camDur, setCamDur] = useState(0);
  const camRef = useRef({ scale: 1, x: 0, y: 0 });

  const updateCam = (
    values: { scale: number; x: number; y: number },
    duration = 1
  ) => {
    camRef.current = values;
    setCamDur(duration);
    setCam(values);
  };

  /* UI state */
  const [lang, setLang] = useState<Lang>("en");
  const [isDark, setIsDark] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cycle, setCycle] = useState(0);

  const currentLang = LANGUAGES.find((l) => l.code === lang)!;
  const t = dashLabels[lang];

  /* ─── Camera helpers (clamped to prevent edge gaps) ─── */

  const centerCamOn = (
    ref: RefObject<HTMLElement | null>,
    scale: number
  ): { x: number; y: number } => {
    if (!ref.current || !containerRef.current) return { x: 0, y: 0 };
    const pos = getElPos(ref.current, containerRef.current);
    const elX = pos.x;
    const elY = pos.y - CHROME_H;
    const rawX = VIEWPORT_W / 2 - elX * scale;
    const rawY = VIEWPORT_H / 2 - elY * scale;
    /* Clamp so the viewport never exceeds the scaled content bounds */
    return {
      x: Math.max(VIEWPORT_W * (1 - scale), Math.min(0, rawX)),
      y: Math.max(VIEWPORT_H * (1 - scale), Math.min(0, rawY)),
    };
  };

  /* ─── Animation sequence ─── */

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const pause = (ms: number) =>
      new Promise<void>((res) => {
        setTimeout(res, ms);
      });

    const click = async () => {
      if (cancelled || !cursorScope.current) return;
      await animateCursor(
        cursorScope.current,
        { scale: 0.78 },
        { duration: 0.09 }
      );
      await animateCursor(
        cursorScope.current,
        { scale: 1 },
        { duration: 0.18, ease: easeSoft }
      );
    };

    /* Camera-aware cursor positioning */
    const moveTo = async (
      ref: RefObject<HTMLElement | null>,
      duration = 0.8,
      moveEase: readonly number[] = easeSoft
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const pos = getElPos(ref.current, containerRef.current);
      const c = camRef.current;

      const vx = c.x + pos.x * c.scale;
      const vy = CHROME_H + c.y + (pos.y - CHROME_H) * c.scale;

      await animateCursor(
        cursorScope.current,
        { x: vx, y: vy },
        { duration, ease: moveEase as [number, number, number, number] }
      );
    };

    /* Move to a dropdown item using direct ref */
    const moveToDropdownItem = async (langCode: Lang, duration = 0.5) => {
      const el = dropdownItemRefs.current[langCode];
      if (cancelled || !cursorScope.current || !el || !containerRef.current)
        return;
      const pos = getElPos(el, containerRef.current);
      const c = camRef.current;

      const vx = c.x + pos.x * c.scale;
      const vy = CHROME_H + c.y + (pos.y - CHROME_H) * c.scale;

      await animateCursor(
        cursorScope.current,
        { x: vx, y: vy },
        { duration, ease: easeSoft }
      );
    };

    /* Tracked move — camera + cursor move together */
    const trackTo = async (
      ref: RefObject<HTMLElement | null>,
      scale: number,
      duration = 0.9
    ) => {
      const camPos = centerCamOn(ref, scale);
      updateCam({ scale, ...camPos }, duration);
      await moveTo(ref, duration, appleEase);
    };

    const run = async () => {
      /* ── Reset ── */
      await pause(400);
      if (cancelled) return;

      setLang("en");
      setIsDark(false);
      setShowDropdown(false);
      updateCam({ scale: 1, x: 0, y: 0 }, 0);

      if (!cursorScope.current) return;

      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 210, y: 180 },
        { duration: 0 }
      );
      await pause(800);
      if (cancelled) return;

      /* ── Step 1: Show dashboard briefly ── */
      await pause(1200);
      if (cancelled) return;

      /* ── Step 2: Fade cursor in, zoom into language picker ── */
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(300);
      if (cancelled) return;

      await trackTo(langPickerRef, 3.2, 1.1);
      if (cancelled) return;
      await pause(400);
      if (cancelled) return;

      /* ── Step 3: Language switching via dropdown ── */

      // Click lang picker → open dropdown
      await click();
      if (cancelled) return;
      setShowDropdown(true);
      await pause(500);
      if (cancelled) return;

      // Select Türkçe
      await moveToDropdownItem("tr", 0.5);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setLang("tr");
      setShowDropdown(false);
      await pause(800);
      if (cancelled) return;

      // Click again → select فارسی
      await moveTo(langPickerRef, 0.4);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setShowDropdown(true);
      await pause(500);
      if (cancelled) return;

      await moveToDropdownItem("fa", 0.5);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setLang("fa");
      setShowDropdown(false);
      await pause(800);
      if (cancelled) return;

      // Click again → select English
      await moveTo(langPickerRef, 0.4);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setShowDropdown(true);
      await pause(500);
      if (cancelled) return;

      await moveToDropdownItem("en", 0.5);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setLang("en");
      setShowDropdown(false);
      await pause(600);
      if (cancelled) return;

      /* ── Step 4: Move to theme toggle ── */
      await moveTo(themeToggleRef, 0.6);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      setIsDark(true);
      await pause(1200);
      if (cancelled) return;

      // Click again → light mode
      await click();
      if (cancelled) return;
      setIsDark(false);
      await pause(600);
      if (cancelled) return;

      /* ── Step 5: Zoom back out ── */
      updateCam({ scale: 1, x: 0, y: 0 }, 1);
      await animateCursor(
        cursorScope.current,
        { x: 210, y: 165 },
        { duration: 1, ease: appleEase as [number, number, number, number] }
      );
      if (cancelled) return;
      await pause(400);

      /* ── Fade cursor out ── */
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }
      await pause(2000);

      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, cycle]);

  /* ─── Render ─── */

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl shadow-black/10"
    >
      {/* Grainient background */}
      <div className="absolute inset-0">
        <Grainient
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
          grainAmount={0.08}
          timeSpeed={0.15}
          contrast={1.3}
          className="h-full w-full"
        />
      </div>
      <motion.div
        animate={{
          backgroundColor: isDark
            ? "rgba(0, 0, 0, 0.5)"
            : "rgba(0, 0, 0, 0)",
        }}
        transition={{ duration: 0.5, ease }}
        className="pointer-events-none absolute inset-0"
      />

      {/* Window chrome */}
      <div className="relative z-10 flex items-center gap-1.5 px-3.5 py-2">
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
      </div>

      {/* Content — camera-transformed */}
      <div className="relative z-10 h-[330px] overflow-hidden">
        <motion.div
          animate={{
            scale: cam.scale,
            x: cam.x,
            y: cam.y,
          }}
          transition={{
            duration: camDur,
            ease: appleEase,
          }}
          style={{ transformOrigin: "0 0" }}
          className="h-full w-full"
        >
          {/* Dashboard gradient (same as BrowseDemo) */}
          <DashboardGradient />

          {/* ── Top bar (matches BrowseDemo MiniTopBar + lang picker + theme toggle) ── */}
          <div className="relative z-10 flex items-center justify-between px-4 py-2.5">
            {/* Left — avatar + greeting */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-900/20 bg-gray-900/10 text-[7px] font-medium text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
                S
              </div>
              <motion.span
                animate={{ color: isDark ? "#ffffff" : "#111827" }}
                transition={{ duration: 0.5, ease }}
                className="font-display text-[8px] font-light"
              >
                {LANGUAGES.find((l) => l.code === lang)!.code === "en"
                  ? "Hello Sarah"
                  : lang === "tr"
                    ? "Merhaba Sarah"
                    : "سلام سارا"}
              </motion.span>
            </div>

            {/* Right — language picker + theme toggle */}
            <div className="flex items-center gap-1">
              {/* LanguagePicker */}
              <div className="relative">
                <div
                  ref={langPickerRef}
                  className="flex h-[14px] w-[14px] items-center justify-center rounded-full"
                >
                  <motion.span
                    animate={{
                      color: isDark
                        ? "rgba(255, 255, 255, 0.7)"
                        : "rgba(17, 24, 39, 0.7)",
                    }}
                    transition={{ duration: 0.5, ease }}
                    className="text-[5px] font-medium leading-none"
                  >
                    {currentLang.short}
                  </motion.span>
                </div>

                {/* Dropdown */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease }}
                      className="absolute right-0 top-[18px] z-50 overflow-hidden rounded-lg border border-gray-900/15 bg-white/70 backdrop-blur-xl dark:border-white/20 dark:bg-gray-900/80"
                      style={{ minWidth: "42px" }}
                    >
                      {LANGUAGES.map((l) => (
                        <div
                          key={l.code}
                          ref={(el) => {
                            dropdownItemRefs.current[l.code] = el;
                          }}
                          className={`px-2 py-[3px] text-center text-[5px] ${
                            lang === l.code
                              ? "font-medium text-[#5227FF] dark:text-[#8B6FFF]"
                              : "text-gray-900/80 dark:text-white/80"
                          }`}
                        >
                          {l.label}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ThemeToggle — Sun/Moon with rotate+scale */}
              <div
                ref={themeToggleRef}
                className="flex h-[14px] w-[14px] items-center justify-center rounded-full"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: 90, scale: 0 }}
                      transition={{ duration: 0.25, ease }}
                      className="h-[8px] w-[8px] text-white/70"
                    >
                      <MiniMoon />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: -90, scale: 0 }}
                      transition={{ duration: 0.25, ease }}
                      className="h-[8px] w-[8px] text-gray-900/70"
                    >
                      <MiniSun />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Dashboard content (matches BrowseDemo exactly) ── */}
          <div className="relative z-10 flex h-[calc(100%-38px)] flex-col">
            <motion.div
              animate={{ color: isDark ? "#ffffff" : "#111827" }}
              transition={{ duration: 0.5, ease }}
              className="mt-1 text-center font-display text-[15px] font-light"
            >
              {t.greeting}
            </motion.div>

            <div className="flex flex-1 items-center justify-center px-6 pb-4">
              <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                {[
                  {
                    title: t.studies,
                    desc: lang === "tr" ? "İlerlemeyi Takip Et" : lang === "fa" ? "پیگیری پیشرفت" : "Track Progress",
                    img: `${R2}/images/my-studies.webp`,
                    key: "studies",
                  },
                  {
                    title: t.space,
                    desc: lang === "tr" ? "Notlar Ve Daha Fazlası" : lang === "fa" ? "یادداشت‌ها و بیشتر" : "Notes & More",
                    img: `${R2}/images/my-space.webp`,
                    key: "space",
                  },
                  {
                    title: t.courses,
                    desc: lang === "tr" ? "Hepsine Göz At" : lang === "fa" ? "مرور همه" : "Browse All",
                    img: `${R2}/images/courses.webp`,
                    key: "courses",
                  },
                ].map((card) => (
                  <motion.div
                    key={card.key}
                    animate={{
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(17, 24, 39, 0.1)",
                    }}
                    transition={{ duration: 0.5, ease }}
                    className="overflow-hidden rounded-lg border bg-white/50 backdrop-blur-xl dark:bg-white/5"
                  >
                    <div className="flex items-center justify-center px-2 pt-2">
                      <img
                        src={card.img}
                        alt={card.title}
                        className="h-[52px] w-[52px] object-contain"
                      />
                    </div>
                    <div className="px-1 pb-2 pt-1 text-center">
                      <motion.div
                        animate={{ color: isDark ? "#ffffff" : "#111827" }}
                        transition={{ duration: 0.5, ease }}
                        className="font-display text-[7px] font-light"
                      >
                        {card.title}
                      </motion.div>
                      <motion.div
                        animate={{
                          color: isDark
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(17, 24, 39, 0.5)",
                        }}
                        transition={{ duration: 0.5, ease }}
                        className="mt-0.5 text-[5px]"
                      >
                        {card.desc}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Mouse cursor ── */}
      <div
        ref={cursorScope}
        className="pointer-events-none absolute left-0 top-0 z-30"
        style={{
          opacity: 0,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
        }}
      >
        <svg
          width="16"
          height="20"
          viewBox="0 0 16 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.5 1L1.5 15.5L5.5 11.5L9 18.5L11 17.5L7.5 11L13.5 11L1.5 1Z"
            fill="white"
            stroke="#1a1a1a"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
