"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface MessageBubbleProps {
  message: string;
  senderType: string;
  createdAt: string;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, senderType, createdAt, isCurrentUser }: MessageBubbleProps) {
  const { locale } = useTranslation();
  const isRtl = locale === "fa";
  const isRight = isCurrentUser;
  const date = new Date(createdAt);
  const timeStr = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className={`flex ${isRight ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[80%] flex-col space-y-1 sm:max-w-[70%] ${isRight ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isRight
              ? "bg-[#5227FF] text-white"
              : senderType === "ai"
                ? "border border-dashed border-gray-900/20 bg-white/50 text-gray-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
                : "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
          }`}
        >
          {senderType === "ai" && (
            <Badge
              variant="secondary"
              className="mb-2 rounded-full border-0 bg-gray-200/60 px-2 py-0 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/50"
            >
              AI Generated
            </Badge>
          )}
          <p dir={isRtl ? "rtl" : undefined} className="whitespace-pre-wrap">{message}</p>
        </div>
        <p
          className={`px-1 text-[11px] text-gray-900/40 dark:text-white/40 ${
            isRight ? "text-right" : "text-left"
          }`}
        >
          {senderType === "admin" && !isCurrentUser && (
            <span className="mr-1 font-medium text-gray-900/60 dark:text-white/60">Admin</span>
          )}
          {timeStr}
        </p>
      </div>
    </motion.div>
  );
}
