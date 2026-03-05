"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FacultyCardProps {
  name: string;
  slug: string;
  illustration: string | null;
  courseCount: number;
  index: number;
  highlighted?: boolean;
}

export function FacultyCard({
  name,
  slug,
  illustration,
  courseCount,
  index,
  highlighted,
}: FacultyCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={`/dashboard/courses/${slug}`} className="block">
        <div className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[2rem] border bg-white/50 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg sm:aspect-square sm:rounded-[3rem] dark:bg-white/5 ${highlighted ? "border-[#5227FF]/40 ring-2 ring-[#5227FF]/20" : "border-gray-900/10 dark:border-white/15"}`}>
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
          <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 sm:p-8">
            {illustration ? (
              <div className="relative w-1/2 sm:w-3/5" style={{ aspectRatio: "1" }}>
                <Image
                  src={illustration}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
                  loading={index < 3 ? "eager" : "lazy"}
                  className={`object-contain transition-opacity duration-500 ${
                    imgLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImgLoaded(true)}
                />
                {/* Skeleton pulse while loading */}
                {!imgLoaded && (
                  <div className="absolute inset-0 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
                )}
              </div>
            ) : (
              <div className="flex w-full flex-1 items-center justify-center">
                <span className="font-display text-3xl font-light text-gray-900/20 sm:text-4xl dark:text-white/20">
                  {name.charAt(0)}
                </span>
              </div>
            )}

            {/* Text */}
            <div className="mt-3 shrink-0 text-center sm:mt-5">
              <h2 className="font-display text-lg font-light text-gray-900 sm:text-xl dark:text-white">
                {name}
              </h2>
              <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
                {courseCount} {courseCount === 1 ? "Course" : "Courses"}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
