"use client";

import { useState } from "react";
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
  fileSize: number;
  fileType: string;
  requireApproval: boolean;
  createdAt: Date;
}

interface PresentationCardProps {
  presentation: Presentation;
  onDeleted: () => void;
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

export function PresentationCard({ presentation, onDeleted }: PresentationCardProps) {
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
  const [approval, setApproval] = useState(presentation.requireApproval);

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

    // Start polling for approval requests if 2-step is enabled
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

    // Stop polling after 95s (code expires at 90s + buffer)
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {presentation.fileName}
          </p>
          <p className="mt-1 text-xs text-gray-900/50 dark:text-white/50">
            {formatType(presentation.fileType)} — {formatSize(presentation.fileSize)}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-gray-900/5 px-2 py-1 text-[10px] font-medium uppercase text-gray-900/50 dark:bg-white/10 dark:text-white/50">
          {formatType(presentation.fileType)}
        </span>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePresent}
          disabled={loading || !!codeData}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {loading ? "Generating..." : codeData ? "Active" : "Present"}
        </motion.button>

        {/* 2-Step Toggle */}
        <button
          onClick={handleToggleApproval}
          className="flex items-center gap-1.5 text-xs text-gray-900/50 transition-colors hover:text-gray-900/80 dark:text-white/50 dark:hover:text-white/80"
        >
          <div
            className={`h-4 w-7 rounded-full transition-colors duration-300 ${
              approval ? "bg-blue-500" : "bg-gray-900/20 dark:bg-white/20"
            }`}
          >
            <motion.div
              className="h-4 w-4 rounded-full bg-white shadow-sm"
              animate={{ x: approval ? 12 : 0 }}
              transition={{ duration: 0.2, ease }}
            />
          </div>
          <span>2-Step</span>
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto text-xs text-red-500/60 transition-colors hover:text-red-500 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Code Display */}
      <AnimatePresence>
        {codeData && (
          <CodeDisplay
            code={codeData.code}
            expiresAt={codeData.expiresAt}
            onExpired={handleCodeExpired}
          />
        )}
      </AnimatePresence>

      {/* Approval Request */}
      <AnimatePresence>
        {approvalRequest && (
          <ApprovalRequest
            codeId={approvalRequest.codeId}
            onDone={handleApprovalDone}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
