"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface MajorCardProps {
  name: string;
  slug: string;
  courseCount: number;
  index: number;
}

export function MajorCard({ name, slug, courseCount, index }: MajorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={`/dashboard/${slug}`}>
        <div className="cursor-pointer rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg dark:border-white/15 dark:bg-white/5">
          <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
            {name}
          </h2>
          <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
            {courseCount} {courseCount === 1 ? "Course" : "Courses"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
