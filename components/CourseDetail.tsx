"use client";

import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

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
}

export function CourseDetail({ course }: CourseDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-6"
    >
      <h1 className="text-center font-display text-2xl font-light text-gray-900 dark:text-white">
        {course.title}
      </h1>

      {course.description && (
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-900/50 dark:text-white/50">
          {course.description}
        </p>
      )}

      <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-900/50 dark:text-white/50">
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease, delay: 0.2 + i * 0.08 }}
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
    </motion.div>
  );
}
