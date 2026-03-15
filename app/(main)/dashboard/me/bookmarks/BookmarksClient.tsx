"use client";

import { motion } from "framer-motion";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation, localized, type Locale } from "@/lib/i18n";
import type { FollowedCourse } from "./actions";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const BONE_BASE_LIGHT = "rgba(0, 0, 0, 0.06)";
const BONE_HIGHLIGHT_LIGHT = "rgba(0, 0, 0, 0.10)";
const BONE_BASE_DARK = "rgba(255, 255, 255, 0.06)";
const BONE_HIGHLIGHT_DARK = "rgba(255, 255, 255, 0.12)";

export function BookmarksClient({ courses }: { courses: FollowedCourse[] }) {
  const { t, locale } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const revealContent = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      setLoaded(true);
      return;
    }

    // Use View Transitions API if available for the premium wipe effect
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as any).startViewTransition(() => {
        startTransition(() => setLoaded(true));
      });
    } else {
      startTransition(() => setLoaded(true));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(revealContent, 500);
    return () => clearTimeout(timer);
  }, [revealContent]);

  return (
    <div className="flex h-full flex-col">
      <style>{`
        @property --wipe {
          syntax: '<percentage>';
          inherits: true;
          initial-value: -100%;
        }
        ::view-transition-group(bookmarks-grid) {
          overflow: hidden;
        }
        ::view-transition-image-pair(bookmarks-grid) {
          mix-blend-mode: normal;
        }
        ::view-transition-old(bookmarks-grid) {
          z-index: 2;
          animation: wipe-out 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        ::view-transition-new(bookmarks-grid) {
          animation: wipe-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes wipe-out {
          from {
            --wipe: 100%;
            mask-image: linear-gradient(to right, black var(--wipe), transparent calc(var(--wipe) + 100%));
          }
          to {
            --wipe: -100%;
            mask-image: linear-gradient(to right, black var(--wipe), transparent calc(var(--wipe) + 100%));
          }
        }
        @keyframes wipe-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={t("followedCourses.title")}
          subtitle={t("followedCourses.subtitle")}
        />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div
          ref={containerRef}
          className="mx-auto max-w-5xl pt-8"
          style={{ viewTransitionName: "bookmarks-grid" }}
        >
          {loaded ? (
            <RealContent courses={courses} locale={locale} t={t} />
          ) : (
            <SkeletonGrid count={courses.length || 6} />
          )}
        </div>
      </div>
      <BackButton
        href="/dashboard/me"
        label={t("followedCourses.myStudies")}
        floating
      />
    </div>
  );
}

/* ============== Real content ============== */

function RealContent({
  courses,
  locale,
  t,
}: {
  courses: FollowedCourse[];
  locale: Locale;
  t: (key: string) => string;
}) {
  if (courses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <p className="text-lg font-light text-gray-900/50 dark:text-white/50">
          {t("followedCourses.empty")}
        </p>
        <p className="mt-2 text-sm text-gray-900/30 dark:text-white/30">
          {t("followedCourses.emptyDescription")}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c, index) => {
        const title = localized(locale, c.title, c.translations, "title");
        const href =
          c.facultySlug && c.slug
            ? `/dashboard/courses/${c.facultySlug}/${c.slug}`
            : undefined;

        return (
          <CourseCard
            key={c.id}
            course={{
              id: c.id,
              title,
              slug: c.slug,
              professor: c.professor,
              semester: c.semester,
              programName: c.programName,
            }}
            index={index}
            href={href}
          />
        );
      })}
    </div>
  );
}

/* ============== Skeleton grid ============== */

const shimmerAnimate = { backgroundPosition: ["-200% 0", "200% 0"] };

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE, delay: index * 0.06 }}
      className="group relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl sm:aspect-square sm:rounded-[3rem] dark:border-white/15 dark:bg-white/5"
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 sm:p-8">
        <Bone className="h-6 w-2/3" />
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3 w-1/3" />
      </div>
    </motion.div>
  );
}

function Bone({ className }: { className?: string }) {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const base = isDark ? BONE_BASE_DARK : BONE_BASE_LIGHT;
  const highlight = isDark ? BONE_HIGHLIGHT_DARK : BONE_HIGHLIGHT_LIGHT;

  return (
    <motion.div
      animate={shimmerAnimate}
      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
      className={`rounded-lg ${className ?? ""}`}
      style={{
        background: `linear-gradient(90deg, ${base} 25%, ${highlight} 50%, ${base} 75%)`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}
