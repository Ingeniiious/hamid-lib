"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

interface UploadCardProps {
  onUploaded: () => void;
}

export function UploadCard({ onUploaded }: UploadCardProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.has(file.type)) {
        setError(t("upload.fileNotAllowed"));
        return;
      }

      setUploading(true);
      setProgress(10);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 85));
        }, 200);

        const res = await fetch("/api/portal/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed.");
        }

        setProgress(100);
        onUploaded();
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
        }, 400);
      } catch (e) {
        setError((e as Error).message);
        setUploading(false);
        setProgress(0);
      }
    },
    [onUploaded, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      whileHover={{ scale: 1.01 }}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:rounded-3xl sm:p-8 ${
          dragging
            ? "border-blue-500/50 bg-blue-500/5 dark:border-blue-400/50 dark:bg-blue-400/5"
            : "border-gray-900/10 bg-white/30 hover:border-gray-900/20 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-white/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt"
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="space-y-3"
            >
              <p className="text-sm text-gray-900/60 dark:text-white/60">
                {t("upload.uploading")}
              </p>
              <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-gray-900/10 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="space-y-1.5"
            >
              <p className="text-sm font-medium text-gray-900/70 dark:text-white/70">
                {t("upload.dropOrClick")}
              </p>
              <p className="text-xs text-gray-900/35 dark:text-white/35">
                {t("upload.fileTypes")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="mt-3 text-xs text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
