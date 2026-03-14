"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { SignUpDemo } from "@/components/help/SignUpDemo";
import { BrowseDemo } from "@/components/help/BrowseDemo";
import { ContributeDemo } from "@/components/help/ContributeDemo";
import { AICouncilDemo } from "@/components/help/AICouncilDemo";
import { ExamDemo } from "@/components/help/ExamDemo";
import { RateProfessorDemo } from "@/components/help/RateProfessorDemo";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/* ─── Auto-cycling mockup wrapper ─── */

function MockupFrame({
  screens,
  interval = 3500,
}: {
  screens: React.ReactNode[];
  interval?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timer = setInterval(
      () => setStep((s) => (s + 1) % screens.length),
      interval
    );
    return () => clearInterval(timer);
  }, [isInView, screens.length, interval]);

  // Reset step when scrolling back into view
  useEffect(() => {
    if (isInView) setStep(0);
  }, [isInView]);

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-xl shadow-black/5 dark:border-white/[0.08] dark:bg-gray-900/80"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.05]">
        <div className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/10" />
      </div>

      {/* Content area */}
      <div className="relative h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            {screens[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-4 pt-2">
        {screens.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-6 bg-[#5227FF]"
                : "w-1.5 bg-black/10 dark:bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Feature section layout ─── */

function FeatureSection({
  number,
  titleKey,
  descKey,
  children,
  reverse,
}: {
  number: string;
  titleKey: string;
  descKey: string;
  children: React.ReactNode;
  reverse?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const { t } = useTranslation();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.7, ease }}
      className="py-12 sm:py-20"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        {/* Text */}
        <div className={`text-center ${reverse ? "lg:order-2" : ""}`}>
          <span className="text-sm font-semibold tracking-wide text-[#5227FF]">
            {number}
          </span>
          <h2 className="mt-2 font-display text-3xl font-light text-gray-900 sm:text-4xl dark:text-white">
            {t(titleKey)}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-900/50 dark:text-white/50">
            {t(descKey)}
          </p>
        </div>

        {/* Mockup */}
        <div
          className={`flex items-center justify-center ${reverse ? "lg:order-1" : ""}`}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Mockup screen components ─── */

/* Sign Up */
function SignUpScreen0() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="font-display text-2xl font-light text-gray-900 dark:text-white">
        Libraryyy
      </div>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
        By A Student, For A Student
      </p>
      <div className="mt-6 rounded-full bg-[#5227FF] px-6 py-2.5 text-[11px] font-medium text-white">
        Lets Start
      </div>
    </div>
  );
}

function SignUpScreen1() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="font-display text-lg font-light text-gray-900 dark:text-white">
        Create Account
      </div>
      <div className="mt-5 w-full space-y-2.5">
        <div className="rounded-full border border-black/10 px-4 py-2 text-[10px] text-gray-400 dark:border-white/10 dark:text-gray-500">
          Full Name
        </div>
        <div className="rounded-full border border-black/10 px-4 py-2 text-[10px] text-gray-400 dark:border-white/10 dark:text-gray-500">
          Email
        </div>
        <div className="rounded-full border border-black/10 px-4 py-2 text-[10px] text-gray-400 dark:border-white/10 dark:text-gray-500">
          Password
        </div>
        <div className="rounded-full bg-[#5227FF] py-2.5 text-center text-[10px] font-medium text-white">
          Sign Up
        </div>
      </div>
    </div>
  );
}

function SignUpScreen2() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="font-display text-xl font-light text-gray-900 dark:text-white">
        Good Morning!
      </div>
      <div className="mt-5 grid w-full grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 p-4 text-center dark:from-purple-900/30 dark:to-purple-800/20">
          <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
            My Studies
          </div>
          <div className="mt-1 text-[8px] text-gray-400 dark:text-gray-500">
            Track Progress
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 p-4 text-center dark:from-blue-900/30 dark:to-blue-800/20">
          <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
            Courses
          </div>
          <div className="mt-1 text-[8px] text-gray-400 dark:text-gray-500">
            Browse All
          </div>
        </div>
      </div>
    </div>
  );
}

/* Browse Courses */
function BrowseScreen0() {
  const faculties = [
    {
      name: "Computer Science",
      from: "from-violet-100",
      to: "to-violet-50",
      darkFrom: "dark:from-violet-900/30",
      darkTo: "dark:to-violet-800/20",
    },
    {
      name: "Engineering",
      from: "from-sky-100",
      to: "to-sky-50",
      darkFrom: "dark:from-sky-900/30",
      darkTo: "dark:to-sky-800/20",
    },
    {
      name: "Business",
      from: "from-amber-100",
      to: "to-amber-50",
      darkFrom: "dark:from-amber-900/30",
      darkTo: "dark:to-amber-800/20",
    },
    {
      name: "Medicine",
      from: "from-emerald-100",
      to: "to-emerald-50",
      darkFrom: "dark:from-emerald-900/30",
      darkTo: "dark:to-emerald-800/20",
    },
  ];

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
        Courses
      </div>
      <p className="mt-1 text-center text-[9px] text-gray-400 dark:text-gray-500">
        Browse By Faculty
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {faculties.map((f, i) => (
          <div
            key={i}
            className={`rounded-xl bg-gradient-to-br ${f.from} ${f.to} ${f.darkFrom} ${f.darkTo} p-3.5`}
          >
            <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {f.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowseScreen1() {
  const courses = [
    { name: "Data Structures", prof: "Prof. Johnson" },
    { name: "Algorithms", prof: "Prof. Williams" },
    { name: "Database Systems", prof: "Prof. Davis" },
  ];

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
        Computer Science
      </div>
      <div className="mt-4 space-y-2">
        {courses.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.06]"
          >
            <div className="text-center text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {c.name}
            </div>
            <div className="mt-0.5 text-center text-[8px] text-gray-400 dark:text-gray-500">
              {c.prof}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowseScreen2() {
  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
        Data Structures
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {["Teaching", "Presentation", "Exam"].map((tab, i) => (
          <div
            key={i}
            className={`rounded-full px-3 py-1.5 text-[9px] font-medium ${
              i === 0
                ? "bg-[#5227FF] text-white"
                : "bg-black/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>
      {/* Content skeleton lines */}
      <div className="mx-auto mt-5 w-full max-w-[260px] space-y-2.5">
        <div className="h-2 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
        <div className="mx-auto h-2 w-4/5 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
        <div className="mx-auto h-2 w-[90%] rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
        <div className="mx-auto h-2 w-3/5 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
        <div className="mx-auto h-2 w-[85%] rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

/* Contribute */
function ContributeScreen0() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="font-display text-lg font-light text-gray-900 dark:text-white">
        Contribute
      </div>
      <div className="mt-5 w-full rounded-2xl border-2 border-dashed border-black/10 p-8 text-center dark:border-white/10">
        <div className="text-[11px] text-gray-400 dark:text-gray-500">
          Drop A File Here
        </div>
        <div className="mt-1 text-[9px] text-gray-300 dark:text-gray-600">
          PDF, Images, Documents
        </div>
      </div>
    </div>
  );
}

function ContributeScreen1() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="font-display text-lg font-light text-gray-900 dark:text-white">
        Uploading...
      </div>
      <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        midterm-notes.pdf
      </div>
      <div className="mt-5 w-full">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-[#5227FF]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.8, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function ContributeScreen2() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-7 w-7 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div className="mt-4 font-display text-lg font-light text-gray-900 dark:text-white">
        Submitted!
      </div>
      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        Pending Review
      </div>
    </div>
  );
}

/* Practice & Exam */
function PracticeScreen0() {
  const options = ["Stack", "Queue", "Tree", "Graph"];

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center text-[9px] text-gray-400 dark:text-gray-500">
        Question 3 Of 10
      </div>
      <div className="mt-2 text-center text-[11px] font-medium text-gray-700 dark:text-gray-300">
        Which Data Structure Uses FIFO?
      </div>
      <div className="mt-5 space-y-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className="rounded-full border border-black/[0.08] px-4 py-2 text-center text-[10px] text-gray-600 dark:border-white/[0.08] dark:text-gray-400"
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

function PracticeScreen1() {
  const options = ["Stack", "Queue", "Tree", "Graph"];

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center text-[9px] text-gray-400 dark:text-gray-500">
        Question 3 Of 10
      </div>
      <div className="mt-2 text-center text-[11px] font-medium text-gray-700 dark:text-gray-300">
        Which Data Structure Uses FIFO?
      </div>
      <div className="mt-5 space-y-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`rounded-full border px-4 py-2 text-center text-[10px] ${
              i === 1
                ? "border-[#5227FF] bg-[#5227FF] font-medium text-white"
                : "border-black/[0.08] text-gray-600 dark:border-white/[0.08] dark:text-gray-400"
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

function PracticeScreen2() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="text-5xl font-light text-[#5227FF]">85%</div>
      <div className="mt-3 font-display text-lg font-light text-gray-900 dark:text-white">
        Great Job!
      </div>
      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        8 Of 10 Correct
      </div>
    </div>
  );
}

/* Rate Professors */
function RateScreen0() {
  const profs = [
    { name: "Dr. Johnson", dept: "Computer Science", stars: 4 },
    { name: "Prof. Williams", dept: "Mathematics", stars: 5 },
  ];

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
        Rate My Professor
      </div>
      <div className="mt-4 rounded-full border border-black/[0.08] px-4 py-2 text-[10px] text-gray-400 dark:border-white/[0.08] dark:text-gray-500">
        Search Professors...
      </div>
      <div className="mt-3 space-y-2">
        {profs.map((p, i) => (
          <div
            key={i}
            className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.06]"
          >
            <div className="text-center text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {p.name}
            </div>
            <div className="mt-0.5 text-center text-[8px] text-gray-400 dark:text-gray-500">
              {p.dept}
            </div>
            <div className="mt-1 text-center text-[10px]">
              {Array.from({ length: 5 }, (_, j) => (
                <span
                  key={j}
                  className={
                    j < p.stars
                      ? "text-yellow-400"
                      : "text-gray-200 dark:text-gray-700"
                  }
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RateScreen1() {
  return (
    <div className="flex h-full flex-col items-center px-6 py-5">
      <div className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
        Dr. Johnson
      </div>
      <div className="mt-1 text-center text-[9px] text-gray-400 dark:text-gray-500">
        Computer Science
      </div>
      <div className="mt-4 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`text-xl ${
              i <= 4
                ? "text-yellow-400"
                : "text-gray-200 dark:text-gray-700"
            }`}
          >
            ★
          </span>
        ))}
      </div>
      <div className="mt-4 w-full rounded-2xl border border-black/[0.08] px-4 py-3 text-[9px] text-gray-400 dark:border-white/[0.08] dark:text-gray-500">
        Share Your Experience...
      </div>
      <div className="mt-3 w-full rounded-full bg-[#5227FF] py-2.5 text-center text-[10px] font-medium text-white">
        Submit Review
      </div>
    </div>
  );
}

function RateScreen2() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-7 w-7 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div className="mt-4 font-display text-lg font-light text-gray-900 dark:text-white">
        Review Submitted
      </div>
      <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        Pending Moderation
      </div>
    </div>
  );
}

/* ─── Main page ─── */

export function HelpContent() {
  const { t } = useTranslation();

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Header */}
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-10 sm:pt-14">
          <PageHeader
            title={t("help.title")}
            subtitle={t("help.subtitle")}
          />
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
          }}
        >
          <div className="mx-auto max-w-5xl">
            {/* Section 1: Sign Up */}
            <FeatureSection
              number="01"
              titleKey="help.signUpTitle"
              descKey="help.signUpDesc"
            >
              <SignUpDemo />
            </FeatureSection>

            <div className="mx-auto h-px w-24 bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Section 2: Browse Courses */}
            <FeatureSection
              number="02"
              titleKey="help.browseTitle"
              descKey="help.browseDesc"
              reverse
            >
              <BrowseDemo />
            </FeatureSection>

            <div className="mx-auto h-px w-24 bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Section 3: Contribute */}
            <FeatureSection
              number="03"
              titleKey="help.contributeTitle"
              descKey="help.contributeDesc"
            >
              <ContributeDemo />
            </FeatureSection>

            <div className="mx-auto h-px w-24 bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Section 4: AI Teachers' Council */}
            <FeatureSection
              number="04"
              titleKey="help.aiCouncilTitle"
              descKey="help.aiCouncilDesc"
              reverse
            >
              <AICouncilDemo />
            </FeatureSection>

            <div className="mx-auto h-px w-24 bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Section 5: Practice & Exam */}
            <FeatureSection
              number="05"
              titleKey="help.practiceTitle"
              descKey="help.practiceDesc"
            >
              <ExamDemo />
            </FeatureSection>

            <div className="mx-auto h-px w-24 bg-black/[0.06] dark:bg-white/[0.06]" />

            {/* Section 6: Rate Professors */}
            <FeatureSection
              number="06"
              titleKey="help.rateTitle"
              descKey="help.rateDesc"
              reverse
            >
              <RateProfessorDemo />
            </FeatureSection>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease }}
              className="pb-12 pt-8 text-center sm:pb-20 sm:pt-16"
            >
              <h2 className="font-display text-3xl font-light text-gray-900 sm:text-4xl dark:text-white">
                {t("help.ctaTitle")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-gray-900/50 dark:text-white/50">
                {t("help.ctaDesc")}
              </p>
              <Link
                href="/auth"
                className="mt-8 inline-block rounded-full bg-[#5227FF] px-10 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("help.ctaButton")}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating back button — bottom, same position as dashboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start pb-6 pl-6 sm:justify-center sm:pl-0"
        >
          <Link
            href="/"
            className="pointer-events-auto inline-flex items-center gap-2 transition-opacity hover:opacity-80 sm:-translate-x-[37vw]"
          >
            <img
              src="https://lib.thevibecodedcompany.com/images/back.webp"
              alt="Back"
              width={200}
              height={107}
              loading="eager"
              decoding="async"
              className="h-12 w-auto object-contain sm:h-14"
            />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
