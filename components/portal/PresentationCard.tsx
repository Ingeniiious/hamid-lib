"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CodeDisplay } from "./CodeDisplay";
import { ApprovalRequest } from "./ApprovalRequest";
import {
  generatePortalCode,
  deletePresentation,
  toggleApproval,
  getActiveCode,
} from "@/app/(main)/dashboard/me/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Presentation {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  requireApproval: boolean;
  createdAt: Date;
}

interface PresentationCardProps {
  presentation: Presentation;
  onDeleted: () => void;
  index: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatType(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/webp": "WebP",
    "image/gif": "GIF",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "text/plain": "TXT",
  };
  return map[mime] || mime.split("/").pop()?.toUpperCase() || "FILE";
}

export function PresentationCard({ presentation, onDeleted, index }: PresentationCardProps) {
  const [codeData, setCodeData] = useState<{
    code: string;
    codeId: number;
    expiresAt: string;
    requireApproval: boolean;
  } | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<{
    codeId: number;
    code: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [approval, setApproval] = useState(presentation.requireApproval);
  const [previewing, setPreviewing] = useState(false);

  const handlePresent = async () => {
    setLoading(true);
    const result = await generatePortalCode(presentation.id);
    setLoading(false);

    if ("error" in result) return;

    setCodeData({
      code: result.code!,
      codeId: result.codeId!,
      expiresAt: result.expiresAt!,
      requireApproval: result.requireApproval!,
    });

    if (result.requireApproval) {
      startApprovalPolling(presentation.id);
    }
  };

  const startApprovalPolling = (presentationId: number) => {
    const interval = setInterval(async () => {
      const result = await getActiveCode(presentationId);
      if (!result.active) {
        clearInterval(interval);
        return;
      }
      if (result.active.requestedAt && result.active.approved === null) {
        setApprovalRequest({
          codeId: result.active.id,
          code: result.active.code,
        });
      }
      if (result.active.approved !== null) {
        clearInterval(interval);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 95000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deletePresentation(presentation.id);
    onDeleted();
  };

  const handleToggleApproval = async () => {
    const newVal = !approval;
    setApproval(newVal);
    await toggleApproval(presentation.id, newVal);
  };

  const handleCodeExpired = () => {
    setCodeData(null);
    setApprovalRequest(null);
  };

  const handleApprovalDone = () => {
    setApprovalRequest(null);
  };

  const fileType = formatType(presentation.fileType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease, delay: index * 0.1 }}
      whileHover={{ scale: 1.01 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg sm:rounded-3xl dark:border-white/15 dark:bg-white/5"
    >
      {/* Grainient hover overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.12), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.10), transparent 60%)",
        }}
      />
      {/* Grain noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Top row: type badge + delete */}
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-gray-900/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-900/50 dark:bg-white/10 dark:text-white/50">
            {fileType}
          </span>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="text-[11px] text-gray-900/30 transition-colors hover:text-gray-900/60 disabled:opacity-50 dark:text-white/30 dark:hover:text-white/60"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] text-gray-900/30 transition-colors hover:text-red-500 dark:text-white/30 dark:hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>

        {/* File name */}
        <h3 className="mt-4 truncate font-display text-xl font-light text-gray-900 sm:text-2xl dark:text-white">
          {presentation.fileName}
        </h3>

        {/* File size */}
        <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
          {formatSize(presentation.fileSize)}
        </p>

        {/* Actions row */}
        <div className="mt-5 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePresent}
            disabled={loading || !!codeData}
            className="rounded-xl bg-[#5227FF] px-5 py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating..." : codeData ? "Active" : "Present"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPreviewing(true)}
            className="rounded-xl border border-gray-900/10 px-5 py-2.5 text-xs font-medium text-gray-900/70 transition-colors hover:bg-gray-900/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
          >
            Preview
          </motion.button>

          {/* 2-Step Toggle */}
          <button
            onClick={handleToggleApproval}
            className="flex items-center gap-2 text-xs text-gray-900/50 transition-colors hover:text-gray-900/80 dark:text-white/50 dark:hover:text-white/80"
          >
            <div
              className={`h-5 w-9 rounded-full transition-colors duration-300 ${
                approval ? "bg-[#5227FF]" : "bg-gray-900/15 dark:bg-white/20"
              }`}
            >
              <motion.div
                className="h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ x: approval ? 16 : 0 }}
                transition={{ duration: 0.2, ease }}
              />
            </div>
            <span>2-Step</span>
          </button>
        </div>

        {/* Code Display */}
        <AnimatePresence>
          {codeData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="mt-5 border-t border-gray-900/5 pt-5 dark:border-white/10"
            >
              <CodeDisplay
                code={codeData.code}
                expiresAt={codeData.expiresAt}
                onExpired={handleCodeExpired}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Approval Request */}
        <AnimatePresence>
          {approvalRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="mt-5 border-t border-gray-900/5 pt-5 dark:border-white/10"
            >
              <ApprovalRequest
                codeId={approvalRequest.codeId}
                onDone={handleApprovalDone}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      {previewing && (
        <PreviewModal
          fileUrl={presentation.fileUrl}
          fileName={presentation.fileName}
          fileType={presentation.fileType}
          onClose={() => setPreviewing(false)}
        />
      )}
    </motion.div>
  );
}

function PreviewModal({
  fileUrl,
  fileName,
  fileType,
  onClose,
}: {
  fileUrl: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const isImage = fileType.startsWith("image/");
  const isPdf = fileType === "application/pdf";
  const isDocument = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ].includes(fileType);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${fullscreen ? "" : "p-4 sm:p-8"}`}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease }}
          onClick={(e) => e.stopPropagation()}
          className={`relative flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 ${
            fullscreen
              ? "h-full w-full rounded-none"
              : "max-h-[85vh] w-full max-w-3xl rounded-2xl border border-gray-900/10 sm:rounded-3xl dark:border-white/15"
          }`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-900/5 px-5 py-4 sm:px-6 dark:border-white/10">
            <h3 className="truncate pr-4 font-display text-lg font-light text-gray-900 dark:text-white">
              {fileName}
            </h3>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => setFullscreen((f) => !f)}
                className="text-xs text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
              >
                {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
              <button
                onClick={onClose}
                className="text-xs text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-auto">
            {isImage ? (
              <div className="flex h-full items-center justify-center p-4 sm:p-6">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className={`w-auto rounded-lg object-contain ${fullscreen ? "max-h-full" : "max-h-[70vh]"}`}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={fileName}
                className={fullscreen ? "h-full w-full" : "h-[75vh] w-full"}
              />
            ) : isDocument ? (
              <iframe
                src={googleViewerUrl}
                title={fileName}
                className={fullscreen ? "h-full w-full" : "h-[75vh] w-full"}
              />
            ) : (
              <iframe
                src={googleViewerUrl}
                title={fileName}
                className={fullscreen ? "h-full w-full" : "h-[75vh] w-full"}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
