"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface StatsCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: { direction: "up" | "down"; percentage: number };
  icon: React.ReactNode;
  index?: number;
}

export function StatsCard({ title, value, prefix, suffix, decimals = 0, trend, icon, index = 0 }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 800;
    const multiplier = Math.pow(10, decimals);
    let startTime: number | null = null;
    let animationId: number;

    function animate(currentTime: number) {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easedProgress * value * multiplier) / multiplier);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [value, decimals]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease, delay: index * 0.1 }}
      className="relative rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 p-6"
    >
      <div className="absolute top-6 right-6 text-gray-900/30 dark:text-white/30">
        {icon}
      </div>

      <p className="text-sm text-gray-900/60 dark:text-white/60">{title}</p>

      <p className="mt-2 text-3xl font-display font-light text-gray-900 dark:text-white">
        {prefix}{decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString()}{suffix}
      </p>

      {trend && (
        <p
          className={`mt-1 text-sm ${
            trend.direction === "up"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {trend.direction === "up" ? "↑" : "↓"} {trend.percentage}%
        </p>
      )}
    </motion.div>
  );
}
