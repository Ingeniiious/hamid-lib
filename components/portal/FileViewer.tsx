"use client";

import { motion } from "framer-motion";
import { ArrowLeft, DownloadSimple } from "@phosphor-icons/react";

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

export function FileViewer({
  fileName,
  fileUrl,
  fileType,
  fileSize,
  onBack,
}: FileViewerProps) {
  const isPdf = fileType === "application/pdf";
  const isImage = fileType.startsWith("image/");

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

      {/* Content */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
        {isPdf ? (
          <iframe
            src={fileUrl}
            className="h-[75vh] w-full"
            title={fileName}
          />
        ) : isImage ? (
          <div className="flex items-center justify-center p-6">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[70vh] rounded-lg object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-white/40">
              Preview not available for this file type.
            </p>
            <p className="mt-1 text-xs text-white/25">
              Use the download button above to save the file.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
