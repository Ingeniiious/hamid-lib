"use client";

import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CourseDetailProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    professor: string | null;
    semester: string | null;
    major: string | null;
  };
  isContributor?: boolean;
}

export function CourseDetail({ course, isContributor }: CourseDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className=""
    >
      <div className="mx-auto flex flex-wrap items-center justify-center gap-4 text-sm text-gray-900/50 dark:text-white/50">
        {course.professor && <span>{course.professor}</span>}
        {course.professor && course.semester && (
          <Separator orientation="vertical" className="h-4" />
        )}
        {course.semester && <span>{course.semester}</span>}
      </div>

      <Separator className="mx-auto mt-8 max-w-md bg-gray-900/10 dark:bg-white/10" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Teaching", "Presentation", "Exam / Practice"].map((tab, i) => (
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.2 + i * 0.1 }}
          >
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
              <h3 className="font-display text-sm font-light text-gray-900 dark:text-white">
                {tab}
              </h3>
              <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
                Coming Soon
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contribute CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.6 }}
        className="mt-8 text-center"
      >
        <Link
          href={`/dashboard/contribute?courseId=${course.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-900/10 bg-white/50 px-5 py-2.5 text-sm font-medium text-gray-900/70 transition-colors hover:bg-gray-900/5 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
        >
          {isContributor
            ? "Contribute To This Course"
            : "Become A Contributor"}
        </Link>
      </motion.div>
    </motion.div>
  );
}
