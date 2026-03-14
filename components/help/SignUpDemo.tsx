"use client";

import { useState, useEffect, useRef, type RefObject } from "react";
import { motion, AnimatePresence, useInView, useAnimate } from "framer-motion";
import dynamic from "next/dynamic";
import ConfettiBurst from "@/components/ConfettiBurst";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const easeSoft = [0.33, 1, 0.68, 1] as const;

/* ─── Helpers ─── */

/** Get element center position relative to a container */
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

type Scene = "landing" | "auth" | "otp" | "confetti" | "dashboard";

/* ─── Main component ─── */

export function SignUpDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const [cursorScope, animateCursor] = useAnimate();

  /* Element refs for cursor targets */
  const letsStartRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLDivElement>(null);
  const otpAreaRef = useRef<HTMLDivElement>(null);
  const verifyRef = useRef<HTMLDivElement>(null);

  /* Scene & animation state */
  const [scene, setScene] = useState<Scene>("landing");
  const [cycle, setCycle] = useState(0);

  /* Input text state */
  const [nameText, setNameText] = useState("");
  const [emailText, setEmailText] = useState("");
  const [passwordDots, setPasswordDots] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  /* UI feedback state */
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showUnderline, setShowUnderline] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  /* Blinking text cursor */
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBlink((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  /* ─── Animation sequence ─── */

  useEffect(() => {
    if (!isInView) return;
    let cancelled = false;

    const pause = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(res, ms);
        // Store cleanup if needed
        return () => clearTimeout(id);
      });

    const typeText = async (
      text: string,
      setter: (v: string) => void,
      charDelay = 65
    ) => {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setter(text.slice(0, i));
        await pause(charDelay);
      }
    };

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

    const moveTo = async (
      ref: RefObject<HTMLElement | null>,
      duration = 0.8
    ) => {
      if (cancelled || !cursorScope.current || !ref.current) return;
      const pos = getElPos(ref.current, containerRef.current);
      await animateCursor(
        cursorScope.current,
        { x: pos.x, y: pos.y },
        { duration, ease: easeSoft }
      );
    };

    const run = async () => {
      /* ── Reset everything ── */
      await pause(400);
      if (cancelled) return;

      setScene("landing");
      setNameText("");
      setEmailText("");
      setPasswordDots("");
      setOtpDigits(["", "", "", "", "", ""]);
      setActiveField(null);
      setShowUnderline(false);
      setBtnPressed(false);
      setShowConfetti(false);

      if (!cursorScope.current) return;

      // Hide cursor, position it roughly center
      await animateCursor(
        cursorScope.current,
        { opacity: 0, scale: 1, x: 180, y: 160 },
        { duration: 0 }
      );
      await pause(700);
      if (cancelled) return;

      /* ── SCENE 1: Landing page ── */

      // Fade cursor in
      await animateCursor(
        cursorScope.current,
        { opacity: 1 },
        { duration: 0.35 }
      );
      await pause(500);
      if (cancelled) return;

      // Move to "Lets Start" link
      await moveTo(letsStartRef, 0.9);
      if (cancelled) return;
      await pause(250);

      // Show hand-drawn underline
      setShowUnderline(true);
      await pause(300);
      if (cancelled) return;

      // Click
      await click();
      if (cancelled) return;
      await pause(500);

      /* ── SCENE 2: Auth form ── */
      setShowUnderline(false);
      setScene("auth");

      // Wait for scene transition (exit 350ms + enter 350ms + buffer)
      await pause(900);
      if (cancelled) return;

      // Move to Name field
      await moveTo(nameRef, 0.7);
      if (cancelled) return;
      setActiveField("name");
      await click();
      if (cancelled) return;
      await pause(200);

      // Type name
      await typeText("Sarah", setNameText);
      if (cancelled) return;
      await pause(350);

      // Move to Email field
      await moveTo(emailRef, 0.5);
      if (cancelled) return;
      setActiveField("email");
      await click();
      if (cancelled) return;
      await pause(200);

      // Type email
      await typeText("sarah@uni.edu", setEmailText, 50);
      if (cancelled) return;
      await pause(350);

      // Move to Password field
      await moveTo(passwordRef, 0.5);
      if (cancelled) return;
      setActiveField("password");
      await click();
      if (cancelled) return;
      await pause(200);

      // Type password (dots)
      await typeText("••••••••", setPasswordDots, 70);
      if (cancelled) return;
      setActiveField(null);
      await pause(400);

      // Move to Continue button
      await moveTo(continueRef, 0.6);
      if (cancelled) return;
      setBtnPressed(true);
      await click();
      if (cancelled) return;
      await pause(150);
      setBtnPressed(false);
      await pause(500);

      /* ── SCENE 3: OTP verification ── */
      setScene("otp");
      await pause(900);
      if (cancelled) return;

      // Move to OTP area
      await moveTo(otpAreaRef, 0.7);
      if (cancelled) return;
      await click();
      if (cancelled) return;
      await pause(300);

      // Type OTP digits one by one
      const digits = ["4", "7", "2", "8", "1", "5"];
      for (let i = 0; i < digits.length; i++) {
        if (cancelled) return;
        setOtpDigits((prev) => {
          const next = [...prev];
          next[i] = digits[i];
          return next;
        });
        await pause(180);
      }
      if (cancelled) return;
      await pause(500);

      // Move to Verify button
      await moveTo(verifyRef, 0.6);
      if (cancelled) return;
      setBtnPressed(true);
      await click();
      if (cancelled) return;
      await pause(150);
      setBtnPressed(false);
      await pause(500);

      /* ── SCENE 4: Confetti burst (stays on OTP card) ── */
      setScene("confetti");
      setShowConfetti(true);

      // Fade cursor out during confetti
      if (cursorScope.current) {
        animateCursor(
          cursorScope.current,
          { opacity: 0 },
          { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        );
      }
      await pause(2200);
      if (cancelled) return;

      /* ── SCENE 5: Dashboard (redirect destination) ── */
      setShowConfetti(false);
      setScene("dashboard");
      await pause(3000);

      // Loop
      if (!cancelled) setCycle((c) => c + 1);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isInView, cycle, animateCursor, cursorScope]);

  /* ─── Render ─── */

  const textCursor = (field: string) =>
    activeField === field ? (
      <span
        className={`ml-px inline-block w-px ${blink ? "bg-white" : "bg-transparent"}`}
        style={{ height: "1em" }}
      />
    ) : null;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl shadow-black/10"
    >
      {/* Actual Grainient background — same as app layout */}
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
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 dark:bg-black/50" />

      {/* Window chrome */}
      <div className="relative z-10 flex items-center gap-1.5 px-3.5 py-2">
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
        <div className="h-[5px] w-[5px] rounded-full bg-white/25" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-[330px]">
        <AnimatePresence mode="wait">
          {/* ── Landing page ── */}
          {scene === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {/* Title */}
              <div className="font-display text-[32px] font-light tracking-tight text-white">
                Libraryyy
              </div>

              {/* Subtitle */}
              <div className="mt-2 font-gochi text-[12px] text-white/60">
                By A Student, For A Student
              </div>

              {/* Nav links */}
              <div className="mt-12 flex items-center gap-5">
                <div
                  ref={letsStartRef}
                  className="relative cursor-default font-delicious text-[14px] text-white"
                >
                  Lets Start
                  {/* Hand-drawn underline SVG */}
                  {showUnderline && (
                    <motion.svg
                      className="absolute -bottom-1.5 left-0 w-full"
                      viewBox="0 0 80 6"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <motion.path
                        d="M2 4.5c15-4 35-4 76 0"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, ease: easeSoft }}
                      />
                      <motion.path
                        d="M4 3c20-2.5 40-1 72 0"
                        stroke="white"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeOpacity={0.5}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: 0.25,
                          delay: 0.08,
                          ease: easeSoft,
                        }}
                      />
                    </motion.svg>
                  )}
                </div>
                <div className="font-gochi text-[14px] text-white/40">
                  Portal
                </div>
                <div className="text-[11px] text-white/30">EN</div>
              </div>
            </motion.div>
          )}

          {/* ── Auth form ── */}
          {scene === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex items-center justify-center px-8"
            >
              <div className="w-full rounded-[20px] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
                {/* Title */}
                <div className="text-center font-display text-[17px] font-light text-white">
                  Create Account
                </div>

                {/* Fields */}
                <div className="mt-5 space-y-2.5">
                  {/* Name */}
                  <div
                    ref={nameRef}
                    className={`rounded-full border px-4 py-[8px] text-center text-[10px] transition-colors duration-150 ${
                      activeField === "name"
                        ? "border-white/40 bg-white/15"
                        : "border-white/20 bg-white/10"
                    }`}
                  >
                    {nameText ? (
                      <span className="text-white">
                        {nameText}
                        {textCursor("name")}
                      </span>
                    ) : (
                      <span className="text-white/50">
                        Full Name
                        {textCursor("name")}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div
                    ref={emailRef}
                    className={`rounded-full border px-4 py-[8px] text-center text-[10px] transition-colors duration-150 ${
                      activeField === "email"
                        ? "border-white/40 bg-white/15"
                        : "border-white/20 bg-white/10"
                    }`}
                  >
                    {emailText ? (
                      <span className="text-white">
                        {emailText}
                        {textCursor("email")}
                      </span>
                    ) : (
                      <span className="text-white/50">
                        Email
                        {textCursor("email")}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div
                    ref={passwordRef}
                    className={`rounded-full border px-4 py-[8px] text-center text-[10px] transition-colors duration-150 ${
                      activeField === "password"
                        ? "border-white/40 bg-white/15"
                        : "border-white/20 bg-white/10"
                    }`}
                  >
                    {passwordDots ? (
                      <span className="text-white">
                        {passwordDots}
                        {textCursor("password")}
                      </span>
                    ) : (
                      <span className="text-white/50">
                        Password
                        {textCursor("password")}
                      </span>
                    )}
                  </div>

                  {/* Continue button */}
                  <div
                    ref={continueRef}
                    className={`rounded-full py-[8px] text-center text-[10px] font-medium transition-all duration-100 ${
                      btnPressed
                        ? "scale-[0.97] bg-white/80 text-gray-900"
                        : "bg-white text-gray-900"
                    }`}
                  >
                    Continue
                  </div>
                </div>

                {/* Toggle text */}
                <div className="mt-4 text-center text-[9px] text-white/50">
                  Already have an account?{" "}
                  <span className="text-white/80 underline">Sign In</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── OTP verification ── */}
          {(scene === "otp" || scene === "confetti") && (
            <motion.div
              key="otp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex items-center justify-center px-8"
            >
              <div className="w-full rounded-[20px] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
                {/* Title */}
                <div className="text-center font-display text-[17px] font-light text-white">
                  Verify Email
                </div>

                {/* Subtitle */}
                <div className="mt-2 text-center text-[9px] text-white/50">
                  Enter the 6-digit code sent to
                </div>
                <div className="mt-0.5 text-center text-[9px] text-white/70">
                  sarah@uni.edu
                </div>

                {/* OTP — connected bar (matches real InputOTPGroup) */}
                <div
                  ref={otpAreaRef}
                  className="mt-6 flex items-center justify-center"
                >
                  <div className="flex items-center">
                    {otpDigits.map((digit, i) => (
                      <div
                        key={i}
                        className={`flex h-[32px] w-[30px] items-center justify-center border-y border-r text-[13px] font-medium text-white transition-colors duration-150 ${
                          i === 0 ? "rounded-l-md border-l" : ""
                        } ${i === 5 ? "rounded-r-md" : ""} ${
                          digit
                            ? "border-white/40 bg-white/15"
                            : "border-white/20 bg-white/10"
                        }`}
                      >
                        {digit && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {digit}
                          </motion.span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verify button */}
                <div
                  ref={verifyRef}
                  className={`mt-5 rounded-full py-[8px] text-center text-[10px] font-medium transition-all duration-100 ${
                    btnPressed
                      ? "scale-[0.97] bg-white/80 text-gray-900"
                      : "bg-white text-gray-900"
                  }`}
                >
                  Verify & Create Account
                </div>

                {/* Links */}
                <div className="mt-3 flex items-center justify-center gap-3 text-[8px]">
                  <span className="text-white/50 underline">Resend Code</span>
                  <span className="text-white/50 underline">Back</span>
                </div>
              </div>

            </motion.div>
          )}

          {/* ── Dashboard (redirect destination) ── */}
          {scene === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-0"
            >
              {/* Gradient overlay — Grainient visible at top, fading to solid bg
                  Matches: bg-gradient-to-b from-transparent via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%] */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-[20%] to-white to-[45%] dark:via-gray-950/60 dark:to-gray-950" />

              {/* Dashboard content — layered on top of gradient */}
              <div className="relative z-10 flex h-full flex-col">
                {/* DashboardTopBar — avatar + "Hello Sarah" left, 2 icons right */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  {/* Left — avatar + name */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-900/20 bg-gray-900/10 text-[7px] font-medium text-gray-900 dark:border-white/20 dark:bg-white/10 dark:text-white">
                      S
                    </div>
                    <span className="font-display text-[8px] font-light text-gray-900 dark:text-white">
                      Hello Sarah
                    </span>
                  </div>
                  {/* Right — language picker + theme toggle */}
                  <div className="flex items-center gap-2">
                    <div className="h-[14px] w-[14px] rounded-full border border-gray-900/15 dark:border-white/15" />
                    <div className="h-[14px] w-[14px] rounded-full border border-gray-900/15 dark:border-white/15" />
                  </div>
                </motion.div>

                {/* PageHeader — Greeting (centered) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mt-1 text-center font-display text-[15px] font-light text-gray-900 dark:text-white"
                >
                  Good Morning, Sarah
                </motion.div>

                {/* DashboardCardGrid — 3 smaller cards */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="flex flex-1 items-center justify-center px-6 pb-4"
                >
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
                    {[
                      { title: "My Studies", desc: "Track Progress", img: "https://lib.thevibecodedcompany.com/images/my-studies.webp" },
                      { title: "My Space", desc: "Notes & More", img: "https://lib.thevibecodedcompany.com/images/my-space.webp" },
                      { title: "Courses", desc: "Browse All", img: "https://lib.thevibecodedcompany.com/images/courses.webp" },
                    ].map((card, i) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                        className="overflow-hidden rounded-lg border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
                      >
                        {/* Card image — smaller, no clipping */}
                        <div className="flex items-center justify-center px-2 pt-2">
                          <img
                            src={card.img}
                            alt={card.title}
                            className="h-[52px] w-[52px] object-contain"
                          />
                        </div>
                        {/* Card text — pinned at bottom */}
                        <div className="px-1 pb-2 pt-1 text-center">
                          <div className="font-display text-[7px] font-light text-gray-900 dark:text-white">
                            {card.title}
                          </div>
                          <div className="mt-0.5 text-[5px] text-gray-900/50 dark:text-white/50">
                            {card.desc}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confetti — same component & props as real auth page */}
      {showConfetti && (
        <ConfettiBurst particleCount={90} startVelocity={32} spread={130} />
      )}

      {/* ── Mouse cursor ── */}
      <div
        ref={cursorScope}
        className="pointer-events-none absolute left-0 top-0 z-30"
        style={{ opacity: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
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
