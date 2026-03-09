"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface SpaceCardProps {
  title: string;
  description: string;
  href: string;
  icon?: Icon;
  image?: string;
  imageClassName?: string;
  accentColor?: string;
  accentColorDark?: string;
  index: number;
}

export function SpaceCard({
  title,
  description,
  href,
  icon: IconComponent,
  image,
  imageClassName,
  accentColor,
  accentColorDark,
  index,
}: SpaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: index * 0.15 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={href} className="block">
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
          <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 sm:p-8">
            {/* Icon or Image */}
            {image ? (
              <div className="relative min-h-0 flex-1 w-full">
                <div className="absolute -top-4 -left-4 -right-4 -bottom-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={image}
                    alt={title}
                    width={512}
                    height={512}
                    loading="eager"
                    decoding="async"
                    className={imageClassName || "max-h-full w-full object-contain scale-110"}
                  />
                </div>
              </div>
            ) : IconComponent ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div
                  className={`rounded-3xl bg-gradient-to-br p-6 sm:p-8 ${accentColor} ${accentColorDark}`}
                >
                  <IconComponent
                    weight="duotone"
                    className="h-16 w-16 text-gray-800 sm:h-20 sm:w-20 dark:text-white"
                  />
                </div>
              </div>
            ) : null}

            {/* Text — always pinned at bottom */}
            <div className="shrink-0 pt-3 text-center sm:pt-5">
              <h2 className="font-display text-2xl font-light text-gray-900 sm:text-3xl dark:text-white">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-gray-900/50 sm:text-base dark:text-white/50">
                {description}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
