"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, DownloadSimple, ArrowsOut, ArrowsIn } from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FileViewerProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  onBack?: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOCUMENT_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function FileViewer({
  fileName,
  fileUrl,
  fileType,
  fileSize,
  onBack,
}: FileViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const isPdf = fileType === "application/pdf";
  const isImage = fileType.startsWith("image/");
  const isDocument = DOCUMENT_TYPES.includes(fileType);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    },
    [fullscreen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-hide UI in fullscreen after 3s of no mouse movement
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!fullscreen) {
      setUiVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [fullscreen, resetHideTimer]);

  // Fullscreen portal view
  if (fullscreen) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease }}
          className="fixed inset-0 z-50 flex flex-col bg-black"
          onMouseMove={resetHideTimer}
          style={{ cursor: uiVisible ? "default" : "none" }}
        >
          {/* Fullscreen header — auto-hides */}
          <motion.div
            initial={false}
            animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : -20 }}
            transition={{ duration: 0.35, ease }}
            className="absolute inset-x-0 top-0 z-10 flex shrink-0 items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-5 py-3 pb-10"
            style={{ pointerEvents: uiVisible ? "auto" : "none" }}
          >
            <p className="truncate pr-4 text-sm font-medium text-white/80">
              {fileName}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/90"
              >
                <DownloadSimple size={14} weight="bold" />
                Download
              </a>
              <button
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/90"
              >
                <ArrowsIn size={14} weight="bold" />
                Exit Fullscreen
              </button>
            </div>
          </motion.div>

          {/* Content */}
          <div className="min-h-0 flex-1">
            {isImage ? (
              <div className="flex h-full items-center justify-center p-4">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-h-full w-auto rounded-lg object-contain"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={fileName}
                className="h-full w-full"
              />
            ) : (
              <iframe
                src={googleViewerUrl}
                title={fileName}
                className="h-full w-full"
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="flex w-full flex-col gap-4"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all duration-300 hover:bg-white/15 hover:text-white/90"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/80">
              {fileName}
            </p>
            <p className="text-xs text-white/30">{formatSize(fileSize)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:text-white/90"
          >
            <ArrowsOut size={14} weight="bold" />
            Fullscreen
          </motion.button>
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={fileUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:text-white/90"
          >
            <DownloadSimple size={14} weight="bold" />
            Download
          </motion.a>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
        {isImage ? (
          <div className="flex items-center justify-center p-6">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[70vh] rounded-lg object-contain"
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            className="h-[75vh] w-full"
            title={fileName}
          />
        ) : isDocument ? (
          <iframe
            src={googleViewerUrl}
            className="h-[75vh] w-full"
            title={fileName}
          />
        ) : (
          <iframe
            src={googleViewerUrl}
            className="h-[75vh] w-full"
            title={fileName}
          />
        )}
      </div>
    </motion.div>
  );
}
