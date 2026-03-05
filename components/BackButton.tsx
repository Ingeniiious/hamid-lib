"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const BACK_IMG = "https://lib.thevibecodedcompany.com/images/back.webp";

interface BackButtonProps {
  href: string;
  label: string;
  invisible?: boolean;
  floating?: boolean;
  closeTab?: boolean;
}

export function BackButton({ href, label, invisible, floating, closeTab }: BackButtonProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const router = useRouter();

  const handleCloseTab = (e: React.MouseEvent) => {
    e.preventDefault();
    // Try to close the tab (works when opened via target="_blank")
    window.close();
    // Fallback if window.close() didn't work (e.g. user navigated directly)
    router.push(href);
  };

  if (floating) {
    const linkProps = closeTab
      ? { href, onClick: handleCloseTab }
      : { href };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.3 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start pb-6 pl-6 sm:justify-center sm:pl-0"
      >
        <Link
          {...linkProps}
          className="pointer-events-auto inline-flex items-center gap-2 transition-opacity hover:opacity-80 sm:-translate-x-[37vw]"
        >
          {!imgFailed ? (
            <img
              src={BACK_IMG}
              alt="Back"
              width={200}
              height={107}
              loading="eager"
              decoding="async"
              onError={() => setImgFailed(true)}
              className="h-12 w-auto object-contain sm:h-14"
            />
          ) : (
            <span className="rounded-full border border-gray-900/10 bg-white/70 px-5 py-2 text-sm text-gray-900/60 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white/60">
              ← {label}
            </span>
          )}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: invisible ? 0 : 1 }}
      transition={{ duration: 0.5, ease }}
      className={invisible ? "pointer-events-none" : undefined}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        tabIndex={invisible ? -1 : undefined}
        aria-hidden={invisible || undefined}
      >
        {!imgFailed ? (
          <img
            src={BACK_IMG}
            alt="Back"
            width={200}
            height={107}
            loading="eager"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-12 w-auto object-contain sm:h-14"
          />
        ) : (
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            ← Back
          </span>
        )}
      </Link>
    </motion.div>
  );
}
