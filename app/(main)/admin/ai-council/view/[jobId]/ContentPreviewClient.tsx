"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowsClockwise } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContentPreviewShell,
  type GeneratedContentItem,
} from "@/components/content/ContentPreviewShell";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface JobSummary {
  id: string;
  courseTitle: string | null;
  courseId: string;
  status: string;
  totalCostUsd: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  outputTypes: string[];
}

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

function titleCase(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatCost(n: number): string {
  if (n === 0) return "$0.0000";
  if (n < 0.001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

export function ContentPreviewClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobSummary | null>(null);
  const [items, setItems] = useState<GeneratedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/ai-council/pipeline-jobs/${jobId}`,
      );
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job not found");
          return;
        }
        throw new Error("Failed to fetch job");
      }
      const data = await res.json();
      setJob({
        id: data.job.id,
        courseTitle: data.job.courseTitle,
        courseId: data.job.courseId,
        status: data.job.status,
        totalCostUsd: data.job.totalCostUsd,
        totalInputTokens: data.job.totalInputTokens,
        totalOutputTokens: data.job.totalOutputTokens,
        outputTypes: Array.isArray(data.job.outputTypes)
          ? data.job.outputTypes
          : [],
      });
      setItems(data.generatedContent ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (loading) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
        >
          <Skeleton className="mx-auto h-4 w-40" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
        >
          <div className="flex justify-center gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.3 }}
        >
          <Skeleton className="mx-auto h-[300px] w-full max-w-3xl rounded-2xl" />
        </motion.div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <button
          onClick={() => router.push(`/admin/ai-council/${jobId}`)}
          className="flex items-center justify-center gap-1.5 text-sm text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back To Pipeline View
        </button>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-12 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "Job not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Back + Refresh */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      >
        <button
          onClick={() => router.push(`/admin/ai-council/${jobId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back To Pipeline View
        </button>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
        >
          <ArrowsClockwise size={14} />
          Refresh
        </button>
      </motion.div>

      {/* Job summary header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <div className="flex flex-col items-center gap-2">
          <Badge
            variant="secondary"
            className={
              statusBadge[job.status] ?? statusBadge.pending
            }
          >
            {titleCase(job.status)}
          </Badge>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {job.courseTitle ?? job.courseId}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
              Cost: {formatCost(Number(job.totalCostUsd))}
            </span>
            <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
              {formatTokens(job.totalInputTokens)} in /{" "}
              {formatTokens(job.totalOutputTokens)} out
            </span>
            <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-900/50 dark:bg-white/5 dark:text-white/50">
              {items.length} Content Items
            </span>
          </div>
        </div>
      </motion.div>

      {/* Content Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
      >
        <ContentPreviewShell items={items} />
      </motion.div>
    </div>
  );
}
