"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

interface AppealFormProps {
  contribution: {
    id: number;
    title: string;
    status: string;
    rejectionSource: string | null;
    rejectionReason: string | null;
    reviewNote: string | null;
  };
  existingAppeal: {
    id: number;
    status: string;
    appealText: string;
    currentVouches: number;
    requiredVouches: number;
    adminNote: string | null;
  } | null;
}

export default function AppealFormClient({
  contribution: c,
  existingAppeal,
}: AppealFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [appealText, setAppealText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rejectionReason = c.rejectionReason || c.reviewNote || "No reason provided";

  const handleSubmit = () => {
    if (appealText.trim().length < 10) {
      setError("Please provide at least 10 characters explaining your appeal.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/contributions/${c.id}/appeal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appealText: appealText.trim() }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to submit appeal");
          return;
        }

        setSuccess(true);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-xl mx-auto px-4 py-8"
    >
      <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
        {t("contribute.appealTitle")}
      </h1>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
        &ldquo;{c.title}&rdquo;
      </p>

      {/* Rejection reason */}
      <div className="rounded-2xl bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-800/30 p-4 mb-6 text-center">
        <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-1">
          {t("contribute.rejectionReason")}
        </p>
        <p className="text-sm text-red-700 dark:text-red-300">{rejectionReason}</p>
      </div>

      {/* Existing appeal status */}
      {existingAppeal && !success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 mb-6 text-center"
        >
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t("contribute.appealStatus")}:{" "}
            <span className="capitalize">{existingAppeal.status.replace(/_/g, " ")}</span>
          </p>

          {existingAppeal.status === "vouching" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("contribute.vouchProgress")}: {existingAppeal.currentVouches} / {existingAppeal.requiredVouches}
            </p>
          )}

          {existingAppeal.adminNote && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
              {t("contribute.adminNote")}: {existingAppeal.adminNote}
            </p>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            {existingAppeal.appealText}
          </p>
        </motion.div>
      )}

      {/* Appeal form (only if no active appeal and contribution is rejected) */}
      {!existingAppeal && c.status === "rejected" && !success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-center text-gray-700 dark:text-gray-300 mb-2">
              {t("contribute.appealExplanation")}
            </label>
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              rows={5}
              maxLength={2000}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#5227FF]/30 focus:border-[#5227FF] resize-none"
              placeholder={t("contribute.appealPlaceholder")}
            />
            <p className="text-xs text-gray-400 text-center mt-1">
              {appealText.length} / 2000
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="text-center">
            <motion.button
              onClick={handleSubmit}
              disabled={isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full bg-[#5227FF] px-8 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? t("contribute.submitting") : t("contribute.submitAppeal")}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Success state */}
      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center py-8"
        >
          <p className="text-lg font-medium text-green-600 dark:text-green-400 mb-4">
            {t("contribute.appealSubmitted")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("contribute.appealVouchInfo")}
          </p>
          <button
            onClick={() => router.push("/dashboard/contribute/my")}
            className="rounded-full bg-gray-100 dark:bg-gray-800 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t("contribute.backToContributions")}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
