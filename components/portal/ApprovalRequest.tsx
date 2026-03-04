"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  approvePortalAccess,
  rejectPortalAccess,
} from "@/app/(main)/dashboard/me/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface ApprovalRequestProps {
  codeId: number;
  onDone: () => void;
}

export function ApprovalRequest({ codeId, onDone }: ApprovalRequestProps) {
  const [handling, setHandling] = useState(false);

  const handleApprove = async () => {
    setHandling(true);
    await approvePortalAccess(codeId);
    onDone();
  };

  const handleReject = async () => {
    setHandling(true);
    await rejectPortalAccess(codeId);
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
    >
      <p className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
        Someone Is Requesting Access
      </p>
      <p className="mt-1 text-center text-xs text-amber-600/60 dark:text-amber-400/60">
        A device entered your code and is waiting for approval.
      </p>

      <div className="mt-3 flex items-center justify-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApprove}
          disabled={handling}
          className="rounded-lg bg-green-600 px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Approve
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReject}
          disabled={handling}
          className="rounded-lg bg-red-500 px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Reject
        </motion.button>
      </div>
    </motion.div>
  );
}
