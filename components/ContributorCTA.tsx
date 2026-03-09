"use client";

import { motion } from "framer-motion";
import { GrainientButton } from "@/components/GrainientButton";
import { FadeImage } from "@/components/FadeImage";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const CDN = "https://lib.thevibecodedcompany.com";

interface ContributorCTAProps {
  heading: string;
  subtext: string;
  href?: string;
  imageHeight?: number;
  /** "full" for empty-state hero, "compact" for below-content CTA */
  variant?: "full" | "compact";
  /** Whether the current user is already a verified contributor */
  isContributor?: boolean;
}

export function ContributorCTA({
  heading,
  subtext,
  href = "/dashboard/contribute",
  imageHeight = 200,
  variant = "full",
  isContributor = false,
}: ContributorCTAProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: 0.3 }}
      className={`mx-auto flex max-w-md flex-col items-center text-center ${
        variant === "full" ? "pt-8" : "pt-4"
      }`}
    >
      <FadeImage
        src={`${CDN}/images/expert.webp`}
        className="w-auto object-contain"
        style={{ height: imageHeight }}
      />
      <h3
        className={`mt-6 font-display font-light text-gray-900 dark:text-white ${
          variant === "full" ? "text-xl" : "text-lg"
        }`}
      >
        {heading}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-900/50 dark:text-white/50">
        {subtext}
      </p>
      <div className="mt-6">
        <GrainientButton href={href}>
          {isContributor ? "Upload Your Materials" : "Become A Contributor"}
        </GrainientButton>
      </div>
    </motion.div>
  );
}
