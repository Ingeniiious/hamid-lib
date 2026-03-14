"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export default function ShareButton({
  title,
  text,
  url,
}: {
  title: string;
  text?: string;
  url?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ||
    (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    // Try native Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: use deprecated execCommand
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ ease: EASE, duration: 0.2 }}
      className="rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 bg-transparent text-gray-900/60 border border-gray-900/15 hover:text-gray-900 hover:border-gray-900/30 dark:text-white/60 dark:border-white/15 dark:hover:text-white dark:hover:border-white/30 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={copied ? "copied" : "share"}
          initial={{ opacity: 0, filter: "blur(6px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          {copied ? t("courses.linkCopied") : t("courses.share")}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
