"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const AVATARS = [
  "https://lib.thevibecodedcompany.com/images/ghost-teacher.webp",
  "https://lib.thevibecodedcompany.com/images/female-teacher.webp",
  "https://lib.thevibecodedcompany.com/images/male-teacher.webp",
];

function getAvatar(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

type Props = {
  professor: {
    id: number;
    name: string;
    slug: string;
    university: string;
    department: string | null;
    rating: { avg: number; count: number; wouldTakeAgain: number };
  };
  index: number;
};

function ratingColor(avg: number) {
  if (avg >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (avg >= 3) return "text-amber-600 dark:text-amber-400";
  if (avg >= 2) return "text-orange-600 dark:text-orange-400";
  if (avg > 0) return "text-red-600 dark:text-red-400";
  return "text-gray-400 dark:text-gray-500";
}

export function ProfessorCard({ professor, index }: Props) {
  const { rating } = professor;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease }}
    >
      <Link
        href={`/professors/${professor.slug}`}
        className="group block rounded-xl border bg-white/80 p-5 shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="shrink-0">
            <Image
              src={getAvatar(professor.name)}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-gray-900 group-hover:text-primary dark:text-white">
              {professor.name}
            </h3>
            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
              {professor.university}
            </p>
            {professor.department && (
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                {professor.department}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-2xl font-semibold ${ratingColor(rating.avg)}`}>
              {rating.avg > 0 ? rating.avg.toFixed(1) : "N/A"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {rating.count} review{rating.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {rating.count > 0 && (
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{rating.wouldTakeAgain}% would take again</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
