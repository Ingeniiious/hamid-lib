"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="flex items-center justify-center py-20"
    >
      <div className="flex flex-col items-center text-center rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 px-12 py-16 max-w-md">
        {icon && (
          <div className="mb-4 text-gray-900/30 dark:text-white/30">{icon}</div>
        )}
        <h2 className="text-xl font-display font-light text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-900/60 dark:text-white/60">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
