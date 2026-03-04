"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCard } from "./UploadCard";
import { PresentationCard } from "./PresentationCard";
import { getMyPresentations } from "@/app/(main)/dashboard/me/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const MAX_FILES = 5;

interface Presentation {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  requireApproval: boolean;
  createdAt: Date;
}

export function PresentationsList() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await getMyPresentations();
      setPresentations(result.presentations);
    } catch {
      setPresentations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const atLimit = presentations.length >= MAX_FILES;
  const progressPercent = (presentations.length / MAX_FILES) * 100;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* File limit progress — always visible when loaded with files */}
      <AnimatePresence>
        {!loading && presentations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-8 text-center"
          >
            <p className="font-display text-3xl font-light text-gray-900 sm:text-4xl dark:text-white">
              {presentations.length}
              <span className="text-gray-900/25 dark:text-white/25">
                {" "}/ {MAX_FILES}
              </span>
            </p>
            <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
              Files Uploaded
            </p>
            <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-gray-900/10 dark:bg-white/10">
              <motion.div
                className={`h-full rounded-full ${atLimit ? "bg-red-400" : "bg-gray-900/30 dark:bg-white/30"}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-gray-900/5 sm:rounded-3xl dark:bg-white/5"
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="space-y-4"
          >
            {!atLimit && <UploadCard onUploaded={refresh} />}

            {atLimit && (
              <p className="text-center text-sm text-gray-900/50 dark:text-white/50">
                Delete A File To Upload More
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {presentations.map((p, i) => (
                <PresentationCard
                  key={p.id}
                  presentation={p}
                  onDeleted={refresh}
                  index={i}
                />
              ))}
            </div>

            {presentations.length === 0 && (
              <p className="pt-2 text-center text-sm text-gray-900/40 dark:text-white/40">
                No files yet. Upload one to get started.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
