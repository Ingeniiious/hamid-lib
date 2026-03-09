"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FloatingBackButtonSetter } from "@/components/FloatingBackButton";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const BACK_IMG = "https://lib.thevibecodedcompany.com/images/back.webp";

interface BackButtonProps {
  href: string;
  label: string;
  invisible?: boolean;
  floating?: boolean;
  closeTab?: boolean;
  useBack?: boolean;
}

export function BackButton({ href, label, invisible, floating, closeTab, useBack }: BackButtonProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (useBack) {
      e.preventDefault();
      router.back();
    } else if (closeTab) {
      e.preventDefault();
      window.close();
      router.push(href);
    }
  };

  // Floating mode: delegate to persistent context (rendered outside PageTransition)
  if (floating) {
    return (
      <FloatingBackButtonSetter
        href={href}
        label={label}
        useBack={useBack}
        closeTab={closeTab}
      />
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
        onClick={handleClick}
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
