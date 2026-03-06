"use client";

import { useState, useTransition, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitReport } from "@/app/(main)/dashboard/contribute/report-actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const reasons = [
  { value: "fake", label: "Fake Content" },
  { value: "incorrect", label: "Incorrect Information" },
  { value: "copyright", label: "Copyright Issue" },
  { value: "other", label: "Other" },
] as const;

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  contributionId: number;
  contributionTitle: string;
}

export function ReportDialog({
  open,
  onClose,
  contributionId,
  contributionTitle,
}: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setReason("");
      setDescription("");
      setError("");
      setSuccess(false);
    }
  }, [open]);

  function handleSubmit() {
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await submitReport({
        contributionId,
        reason: reason as "fake" | "incorrect" | "copyright" | "other",
        description,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease }}
        className="relative w-full max-w-md rounded-2xl border border-gray-900/10 bg-white p-6 shadow-xl dark:border-white/15 dark:bg-gray-950"
      >
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
              Report Submitted
            </h3>
            <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
              Thank you for helping keep the content accurate.
            </p>
            <Button onClick={onClose} className="mt-4 w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
              Report Content
            </h3>
            <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
              &quot;{contributionTitle}&quot;
            </p>

            <div className="mt-4 space-y-3">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select A Reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Describe the issue (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isPending}
              />

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={isPending || !reason}
                >
                  {isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
