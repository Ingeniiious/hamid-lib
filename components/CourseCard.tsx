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
  };
  index: number;
  href?: string;
}

export function CourseCard({ course, index, href }: CourseCardProps) {
  const link = href ?? `/course/${course.slug || course.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={link}>
        <div className="cursor-pointer rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg dark:border-white/15 dark:bg-white/5">
          <h3 className="font-display text-base font-light text-gray-900 dark:text-white">
            {course.title}
          </h3>
          {course.professor && (
            <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
              {course.professor}
            </p>
          )}
          {course.semester && (
            <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
              {course.semester}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
