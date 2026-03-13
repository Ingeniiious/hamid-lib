"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  subscribeToCourse,
  unsubscribeFromCourse,
  subscribeToFaculty,
  unsubscribeFromFaculty,
} from "@/lib/subscriptions";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export default function SubscribeButton({
  entityType,
  entityId,
  initialSubscribed = false,
}: {
  entityType: "course" | "faculty";
  entityId: string;
  initialSubscribed?: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();

  const handleClick = () => {
    startTransition(async () => {
      if (subscribed) {
        const action =
          entityType === "course"
            ? unsubscribeFromCourse
            : unsubscribeFromFaculty;
        await action(entityId);
        setSubscribed(false);
      } else {
        const action =
          entityType === "course"
            ? subscribeToCourse
            : subscribeToFaculty;
        await action(entityId);
        setSubscribed(true);
      }
    });
  };

  const label = subscribed
    ? hovering
      ? t("subscriptions.unfollow")
      : t("subscriptions.following")
    : t("subscriptions.follow");

  return (
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ ease: EASE, duration: 0.2 }}
      className={`
        rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200
        disabled:opacity-50
        ${
          subscribed
            ? hovering
              ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
              : "bg-[#5227FF] text-white"
            : "bg-transparent text-[#5227FF] border border-[#5227FF] hover:bg-[#5227FF]/10"
        }
      `}
    >
      {label}
    </motion.button>
  );
}
