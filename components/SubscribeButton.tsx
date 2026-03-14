"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  subscribeToCourse,
  unsubscribeFromCourse,
  subscribeToFaculty,
  unsubscribeFromFaculty,
} from "@/lib/subscriptions";
import { useTranslation } from "@/lib/i18n";

const SPRING = {
  type: "spring" as const,
  stiffness: 600,
  damping: 30,
};

type ButtonState = "follow" | "following" | "unfollow";

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

  const state: ButtonState = subscribed
    ? hovering
      ? "unfollow"
      : "following"
    : "follow";

  const labels: Record<ButtonState, string> = {
    follow: t("subscriptions.follow"),
    following: t("subscriptions.following"),
    unfollow: t("subscriptions.unfollow"),
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      whileTap={{ scale: 0.97 }}
      className={`
        relative rounded-full text-sm font-medium overflow-hidden disabled:opacity-50
        transition-colors duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        hover:scale-[1.02]
        ${
          subscribed
            ? hovering
              ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
              : "bg-[#5227FF] text-white border border-transparent"
            : "bg-transparent text-[#5227FF] border border-[#5227FF]"
        }
      `}
    >
      <SmoothLabel state={state} labels={labels} />
    </motion.button>
  );
}

/** Measures the next label and spring-animates the button's inner size. */
function SmoothLabel({
  state,
  labels,
}: {
  state: ButtonState;
  labels: Record<ButtonState, string>;
}) {
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      setWidth(measureRef.current.getBoundingClientRect().width);
    }
  }, [state, labels]);

  return (
    <span className="relative flex items-center justify-center" style={{ padding: "8px 20px" }}>
      {/* Invisible measurer */}
      <span ref={measureRef} className="absolute invisible whitespace-nowrap text-sm font-medium">
        {labels[state]}
      </span>

      {/* Animated width container */}
      <motion.span
        animate={{ width: typeof width === "number" ? width : undefined }}
        transition={SPRING}
        className="relative block overflow-hidden"
        style={{ height: 20 }}
      >
        <AnimatePresence mode="sync" initial={false}>
          <motion.span
            key={state}
            className="whitespace-nowrap text-sm font-medium text-current"
            initial={{ y: -14, opacity: 0, filter: "blur(6px)", position: "absolute" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)", position: "relative" }}
            exit={{ y: 14, opacity: 0, filter: "blur(6px)", position: "absolute" }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {labels[state]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}
