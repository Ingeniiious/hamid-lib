"use client";

import { motion } from "framer-motion";
import { GitPullRequest } from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function ContributionsPage() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="mx-auto max-w-md rounded-2xl border border-gray-900/10 bg-white/50 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900/5 dark:bg-white/10">
          <GitPullRequest
            size={24}
            weight="duotone"
            className="text-gray-900/40 dark:text-white/40"
          />
        </div>
        <h2 className="mb-2 font-display text-xl font-light text-gray-900 dark:text-white">
          Contributions Coming Soon
        </h2>
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          The contributions moderation system is under development. Students
          will be able to submit course documents, which will be reviewed and
          used to create original study resources.
        </p>
      </motion.div>
    </div>
  );
}
