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
  fileSize: number;
  fileType: string;
  requireApproval: boolean;
  createdAt: Date;
}

export function PresentationsList() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await getMyPresentations();
    setPresentations(result.presentations);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const atLimit = presentations.length >= MAX_FILES;

  return (
    <div className="space-y-6">
      {atLimit ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-2xl border-2 border-dashed border-gray-900/10 p-6 text-center dark:border-white/15"
        >
          <p className="text-sm text-gray-900/50 dark:text-white/50">
            {presentations.length}/{MAX_FILES} Files — Delete One To Upload More
          </p>
        </motion.div>
      ) : (
        <UploadCard onUploaded={refresh} />
      )}

      {!loading && !atLimit && presentations.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="text-center text-xs text-gray-900/30 dark:text-white/30"
        >
          {presentations.length}/{MAX_FILES} Files
        </motion.p>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="space-y-3"
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5"
              />
            ))}
          </motion.div>
        ) : presentations.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="text-center text-sm text-gray-900/40 dark:text-white/40"
          >
            No files yet. Upload one to get started.
          </motion.p>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="space-y-3"
          >
            {presentations.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: i * 0.1 }}
              >
                <PresentationCard
                  presentation={p}
                  onDeleted={refresh}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
