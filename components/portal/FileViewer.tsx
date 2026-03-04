"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FileViewerProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewer({ fileName, fileUrl, fileType, fileSize }: FileViewerProps) {
  const isPdf = fileType === "application/pdf";
  const isImage = fileType.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="w-full max-w-3xl"
    >
      <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h3 className="truncate text-center text-sm font-medium text-white/80">
          {fileName}
        </h3>
        <p className="mt-1 text-center text-xs text-white/40">
          {formatSize(fileSize)}
        </p>

        {/* Content */}
        <div className="mt-5">
          {isPdf ? (
            <iframe
              src={fileUrl}
              className="h-[70vh] w-full rounded-xl border border-white/10"
              title={fileName}
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="mx-auto max-h-[70vh] rounded-xl object-contain"
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-white/50">
                Preview not available for this file type.
              </p>
            </div>
          )}
        </div>

        {/* Download */}
        <div className="mt-5 flex justify-center">
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={fileUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/25"
          >
            Download File
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}
