"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string | null;
    professor: string | null;
    semester: string | null;
    programName?: string | null;
  };
  index: number;
  href?: string;
}

export function CourseCard({ course, index, href }: CourseCardProps) {
  const link = href ?? `/course/${course.slug || course.id}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={link} className="block">
        <div className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[2rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg sm:aspect-square sm:rounded-[3rem] dark:border-white/15 dark:bg-white/5">
          {/* Grainient hover overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)",
            }}
          />
          {/* Grain noise */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: "128px 128px",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center p-5 sm:p-8">
            <div className="text-center">
              <h3 className="font-display text-xl font-light text-gray-900 sm:text-2xl dark:text-white">
                {course.title}
              </h3>
              {course.programName && (
                <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
                  {course.programName}
                </p>
              )}
              {course.professor && (
                <p className="mt-1 text-sm text-gray-900/40 dark:text-white/40">
                  {course.professor}
                </p>
              )}
              {course.semester && (
                <p className="mt-1 text-xs text-gray-900/30 dark:text-white/30">
                  {course.semester}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
