"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowsOut, ArrowsIn } from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * Dynamic watermark overlay — tiles "libraryyy.com" diagonally across the viewer.
 * pointer-events: none so it doesn't block interaction with the content.
 * Uses both white and black text at low opacity so it's subtly visible on any background.
 */
function WatermarkOverlay({ variant = "light" }: { variant?: "dark" | "light" }) {
  const color =
    variant === "dark"
      ? "rgba(255,255,255,0.05)"
      : "rgba(0,0,0,0.04)";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-x-24 gap-y-16"
        style={{ transform: "rotate(-25deg)" }}
      >
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-display text-lg font-light tracking-wider md:text-xl"
            style={{ color }}
          >
            libraryyy.com
          </span>
        ))}
      </div>
    </div>
  );
}

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

const OFFICE_TYPES = [
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
  const isOffice = OFFICE_TYPES.includes(fileType);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  // Image: detect natural dimensions, set container aspect-ratio dynamically
  const [imageRatio, setImageRatio] = useState<string | null>(null);

  // Measure available height for the inline frame (viewport minus header offset)
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState<string>("80vh");

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Fill from the container top to near the bottom of the viewport (16px padding)
        const available = Math.max(window.innerHeight - rect.top - 16, 200);
        setFrameHeight(`${available}px`);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [fullscreen]);

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

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [fullscreen]);

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

  /* ── Content — always mounted, never destroyed ── */
  const content = (
    <>
      {isImage ? (
        <div className={`flex h-full w-full items-center justify-center ${fullscreen ? "p-4" : "p-4"}`}>
          <img
            src={fileUrl}
            alt={fileName}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setImageRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
              }
            }}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      ) : isPdf ? (
        <iframe src={fileUrl} title={fileName} className="h-full w-full" />
      ) : (
        <iframe src={googleViewerUrl} title={fileName} className="h-full w-full" />
      )}
      {/* Dynamic watermark: dark text for docs/PDFs (white bg), white text for images/fullscreen (dark bg) */}
      <WatermarkOverlay variant={isPdf || isOffice ? "light" : "dark"} />
    </>
  );

  /* ── Inline container sizing ── */
  const inlineContainerStyle: React.CSSProperties = {};
  if (!fullscreen) {
    if (isImage && imageRatio) {
      // Image: use its natural ratio, capped by available height
      inlineContainerStyle.aspectRatio = imageRatio;
      inlineContainerStyle.maxHeight = frameHeight;
      inlineContainerStyle.width = "100%";
    } else {
      // PDFs / Office docs / fallback: fill all available vertical space
      inlineContainerStyle.height = frameHeight;
      inlineContainerStyle.width = "100%";
    }
  }

  return (
    <>
      {/* ── Inline header (hidden when fullscreen) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: fullscreen ? 0 : 1 }}
        transition={{ duration: 0.6, ease }}
        className={`flex w-full flex-col gap-4 ${fullscreen ? "invisible" : ""}`}
      >
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

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:text-white/90"
          >
            <ArrowsOut size={14} weight="bold" />
            Fullscreen
          </motion.button>
        </div>
      </motion.div>

      {/* ── Content container — dynamic sizing ── */}
      <div
        ref={containerRef}
        className={`relative w-full transition-all duration-300 ${
          fullscreen
            ? "fixed inset-0 z-50 bg-black"
            : "overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl"
        }`}
        style={fullscreen ? { cursor: uiVisible ? "default" : "none" } : inlineContainerStyle}
        onMouseMove={fullscreen ? resetHideTimer : undefined}
      >
        {/* Fullscreen header — auto-hides */}
        <AnimatePresence>
          {fullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-x-0 top-0 z-30 flex shrink-0 items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-5 py-3 pb-10"
              style={{ pointerEvents: uiVisible ? "auto" : "none" }}
            >
              <p className="truncate pr-4 text-sm font-medium text-white/80">
                {fileName}
              </p>
              <button
                onClick={() => setFullscreen(false)}
                className="flex shrink-0 items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/90"
              >
                <ArrowsIn size={14} weight="bold" />
                Exit Fullscreen
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actual content */}
        <div className="h-full w-full">
          {content}
        </div>
      </div>
    </>
  );
}
