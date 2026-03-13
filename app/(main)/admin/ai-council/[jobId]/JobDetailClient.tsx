"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  ArrowsClockwise,
  X,
  Eye,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineJobDetail {
  id: string;
  courseId: string;
  courseTitle: string | null;
  contributionIds: unknown;
  status: string;
  currentStep: number;
  outputTypes: string[];
  sourceLanguage: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: string;
  version: number;
  startedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStepFull {
  id: number;
  jobId: string;
  modelSlug: string;
  role: string;
  stepOrder: number;
  status: string;
  inputHash: string | null;
  inputSummary: string | null;
  output: Record<string, unknown> | null;
  verdict: string | null;
  issues: unknown[] | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}

interface GeneratedContentItem {
  id: string;
  contentType: string;
  title: string;
  content: Record<string, unknown> | null;
  richText: string | null;
  language: string;
  modelSource: string | null;
  version: number;
  isPublished: boolean;
  createdAt: string;
}

// Unified type for what we show in the sidebar
type SidebarData = {
  type: "step";
  step: PipelineStepFull;
  relatedContent?: GeneratedContentItem[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  downloading: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  extracting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  classifying: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  enriching: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  validating: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  fact_checking: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  generating: "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]",
  publishing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  skipped: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  needs_changes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TEACHER_IMG_BASE = "https://lib.thevibecodedcompany.com/images/teachers";

const MODEL_INFO: Record<
  string,
  { name: string; role: string; provider: string; color: string; image: string }
> = {
  kimi: {
    name: "Kimi K2.5",
    role: "Creator",
    provider: "Moonshot AI",
    color: "#3B82F6",
    image: `${TEACHER_IMG_BASE}/kimi.webp`,
  },
  chatgpt: {
    name: "GPT-5.4",
    role: "Reviewer",
    provider: "OpenAI",
    color: "#10B981",
    image: `${TEACHER_IMG_BASE}/chatgpt.webp`,
  },
  claude: {
    name: "Claude Opus 4.6",
    role: "Enricher",
    provider: "Anthropic",
    color: "#D97706",
    image: `${TEACHER_IMG_BASE}/claude.webp`,
  },
  gemini: {
    name: "Gemini 3.1 Pro",
    role: "Validator",
    provider: "Google",
    color: "#8B5CF6",
    image: `${TEACHER_IMG_BASE}/gemini.webp`,
  },
  grok: {
    name: "Grok 4.20",
    role: "Fact Checker",
    provider: "xAI",
    color: "#EF4444",
    image: `${TEACHER_IMG_BASE}/grok.webp`,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Shared tiny components
// ---------------------------------------------------------------------------

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium dark:bg-white/5">
      <span className="text-gray-900/50 dark:text-white/50">{label}</span>
      <span className="text-gray-900 dark:text-white">{value}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = statusBadge[status] ?? statusBadge.pending;
  const isAnimated =
    status === "running" ||
    status === "extracting" ||
    status === "downloading" ||
    status === "classifying" ||
    status === "generating";

  const badge = (
    <Badge variant="secondary" className={colors ?? ""}>
      {titleCase(status.replace(/_/g, " "))}
    </Badge>
  );

  if (isAnimated) {
    return (
      <motion.span
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function JobDetailClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<PipelineJobDetail | null>(null);
  const [steps, setSteps] = useState<PipelineStepFull[]>([]);
  const [generatedItems, setGeneratedItems] = useState<GeneratedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ai-council/pipeline-jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job not found");
          return;
        }
        throw new Error("Failed to fetch job");
      }
      const data = await res.json();
      setJob(data.job);
      setSteps(data.steps ?? []);
      setGeneratedItems(data.generatedContent ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 10000);
    return () => clearInterval(interval);
  }, [fetchJob]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const openStepSidebar = (step: PipelineStepFull, relatedContent?: GeneratedContentItem[]) => {
    setSidebarData({ type: "step", step, relatedContent });
    setSidebarOpen(true);
  };

  const handleAction = async (action: "cancel" | "retry") => {
    if (
      action === "cancel" &&
      !window.confirm("Cancel this pipeline job? This cannot be undone.")
    ) {
      return;
    }
    try {
      const res = await fetch("/api/admin/ai-council/job-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type: "pipeline", jobId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Job action failed:", data.error ?? res.statusText);
        return;
      }
      fetchJob();
    } catch (e) {
      console.error("Job action error:", e);
    }
  };

  // Split steps
  const councilSteps = steps.filter((s) => s.stepOrder < 100);
  const generationSteps = steps.filter((s) => s.stepOrder >= 100);

  // Group generation steps by content type
  const generationByType: Record<string, PipelineStepFull[]> = {};
  for (const step of generationSteps) {
    const ct = step.inputSummary?.replace("generate:", "") ?? "unknown";
    if (!generationByType[ct]) generationByType[ct] = [];
    generationByType[ct].push(step);
  }

  // Map generated content by content type for merging into generation sections
  const contentByType: Record<string, GeneratedContentItem[]> = {};
  for (const item of generatedItems) {
    if (!contentByType[item.contentType]) contentByType[item.contentType] = [];
    contentByType[item.contentType].push(item);
  }

  // Cost helpers
  const councilCost = councilSteps.reduce((sum, s) => sum + Number(s.costUsd), 0);
  const sectionCost = (ctSteps: PipelineStepFull[]) =>
    ctSteps.reduce((sum, s) => sum + Number(s.costUsd), 0);
  const totalCost = Number(job?.totalCostUsd ?? 0);

  if (loading) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        {/* Back button skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
        >
          <Skeleton className="mx-auto h-4 w-40 sm:mx-0" />
        </motion.div>

        {/* Job header skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center justify-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Council steps skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
        >
          <Skeleton className="mx-auto mb-3 h-4 w-32" />
          <div className="flex flex-wrap items-stretch justify-center gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl sm:w-[180px] dark:border-white/15 dark:bg-white/10"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Generation skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.3 }}
        >
          <Skeleton className="mx-auto mb-3 h-4 w-40" />
          <div className="flex flex-wrap items-stretch justify-center gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl sm:w-[180px] dark:border-white/15 dark:bg-white/10"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <button
          onClick={() => router.push("/admin/ai-council")}
          className="flex items-center gap-1.5 text-sm text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back To AI Council
        </button>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-12 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "Job not found"}
          </p>
        </div>
      </div>
    );
  }

  const outputTypes = Array.isArray(job.outputTypes) ? job.outputTypes : [];
  const isActive = [
    "pending", "running", "reviewing", "enriching", "validating",
    "fact_checking", "generating", "publishing",
  ].includes(job.status);

  return (
    <>
      <div className="space-y-6 px-6 py-6 sm:px-8">
        {/* Back + Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
        >
          <button
            onClick={() => router.push("/admin/ai-council")}
            className="flex items-center gap-1.5 text-sm text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back To AI Council
          </button>
          <div className="flex items-center gap-2">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleAction("cancel")}
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            )}
            {(job.status === "failed" || job.status === "cancelled") && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleAction("retry")}
              >
                <ArrowsClockwise size={14} className="mr-1" />
                Retry
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={fetchJob}
            >
              <ArrowsClockwise size={14} className="mr-1" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Job Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} />
              <span
                onClick={() => copyToClipboard(job.id, "job-id")}
                title="Click To Copy Full UUID"
                className="cursor-copy select-all font-mono text-sm font-medium text-gray-900 transition-colors hover:text-[#5227FF] dark:text-white dark:hover:text-[#8B6FFF]"
              >
                {job.id.slice(0, 8)}…
              </span>
              {copiedId === "job-id" && (
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  Copied!
                </span>
              )}
            </div>

            <p className="text-sm text-gray-900/60 dark:text-white/60">
              {job.courseTitle ?? job.courseId}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {outputTypes.map((ot) => (
                <span
                  key={ot}
                  className="rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#5227FF] dark:text-[#8B6FFF]"
                >
                  {titleCase(ot.replace(/_/g, " "))}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <MetricPill label="In" value={formatTokens(job.totalInputTokens)} />
              <MetricPill label="Out" value={formatTokens(job.totalOutputTokens)} />
              <MetricPill label="Cost" value={formatCost(Number(job.totalCostUsd))} />
              <MetricPill label="Version" value={`v${job.version}`} />
              {job.sourceLanguage && (
                <MetricPill label="Language" value={job.sourceLanguage.toUpperCase()} />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-gray-900/40 dark:text-white/40">
              <span>Created: {formatDateTime(job.createdAt)}</span>
              {job.startedAt && <span>Started: {formatDateTime(job.startedAt)}</span>}
              {job.completedAt && <span>Completed: {formatDateTime(job.completedAt)}</span>}
              {job.startedAt && job.completedAt && (
                <span>
                  Duration:{" "}
                  {formatDuration(
                    new Date(job.completedAt).getTime() -
                      new Date(job.startedAt).getTime()
                  )}
                </span>
              )}
            </div>

            {job.retryCount > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                Retries: {job.retryCount} / {job.maxRetries}
              </span>
            )}
          </div>

          {job.errorMessage && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-red-600/70 dark:text-red-400/70">
                  Job Error
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Job: ${job.id}\nStatus: ${job.status}\nError: ${job.errorMessage}`,
                      "job-error"
                    )
                  }
                  className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                >
                  {copiedId === "job-error" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="select-text break-words text-[10px] leading-relaxed text-red-600 dark:text-red-400">
                {job.errorMessage}
              </p>
            </div>
          )}
        </motion.div>

        {/* Council Steps — Grid */}
        {councilSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
          >
            <div className="mb-3 flex items-center justify-center gap-3">
              <h3 className="text-center font-display text-sm font-semibold uppercase tracking-wider text-gray-900/50 dark:text-white/50">
                Council Steps ({councilSteps.length})
              </h3>
              <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-semibold text-gray-900/60 dark:bg-white/5 dark:text-white/60">
                {formatCost(councilCost)}
              </span>
            </div>
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              {councilSteps.map((step, idx) => (
                <StepGridCard
                  key={step.id}
                  step={step}
                  index={idx}
                  onView={() => openStepSidebar(step)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Generation — Grid grouped by content type with dividers, costs, and generated content merged */}
        {Object.keys(generationByType).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
          >
            <h3 className="mb-3 text-center font-display text-sm font-semibold uppercase tracking-wider text-gray-900/50 dark:text-white/50">
              Generation ({generationSteps.length} Steps)
            </h3>
            <div className="space-y-6">
              {Object.entries(generationByType).map(([ct, ctSteps], groupIdx) => {
                const ctCost = sectionCost(ctSteps);
                const ctContent = contentByType[ct] ?? [];

                return (
                  <div key={ct}>
                    {groupIdx > 0 && (
                      <div className="mb-4 border-t border-gray-900/10 dark:border-white/10" />
                    )}
                    {/* Section header with cost */}
                    <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
                      <h4 className="text-center text-xs font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                        {titleCase(ct.replace(/_/g, " "))}
                      </h4>
                      <span className="rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#5227FF] dark:text-[#8B6FFF]">
                        {formatCost(ctCost)}
                      </span>
                    </div>

                    {/* Per-model step cards */}
                    <div className="flex flex-wrap items-stretch justify-center gap-3">
                      {ctSteps.map((step, idx) => (
                        <StepGridCard
                          key={step.id}
                          step={step}
                          index={idx}
                          onView={() => openStepSidebar(step, ctContent.filter((c) => c.modelSource === step.modelSlug))}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Big Total Cost */}
        {steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease, delay: 0.5 }}
            className="rounded-2xl border border-gray-900/10 bg-white/50 py-10 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
              Total Cost
            </span>
            <span className="mt-2 block font-display text-4xl font-light text-gray-900 sm:text-5xl dark:text-white">
              {totalCost < 0.001
                ? `$${totalCost.toFixed(6)}`
                : totalCost < 1
                  ? `$${totalCost.toFixed(4)}`
                  : `$${totalCost.toFixed(2)}`}
            </span>
            <span className="mt-1 block text-[10px] text-gray-900/30 dark:text-white/30">
              {formatTokens(job.totalInputTokens)} in + {formatTokens(job.totalOutputTokens)} out
            </span>
          </motion.div>
        )}
      </div>

      {/* Right Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
        >
          {sidebarData?.type === "step" && (
            <StepSidebarContent
              step={sidebarData.step}
              relatedContent={sidebarData.relatedContent}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step Grid Card — compact card for grid layout
// ---------------------------------------------------------------------------

function StepGridCard({
  step,
  index,
  onView,
}: {
  step: PipelineStepFull;
  index: number;
  onView: () => void;
}) {
  const info = MODEL_INFO[step.modelSlug];
  const hasViewable =
    (step.output && Object.keys(step.output).length > 0) ||
    (step.issues && Array.isArray(step.issues) && step.issues.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease }}
      className="group relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl transition-colors hover:border-[#5227FF]/20 sm:aspect-square sm:w-[180px] dark:border-white/15 dark:bg-white/10 dark:hover:border-[#5227FF]/30"
    >
      {/* Model avatar + name */}
      <img
        src={info?.image ?? ""}
        alt={info?.name ?? step.modelSlug}
        className="h-10 w-10 rounded-full object-cover"
      />
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {info?.name ?? step.modelSlug}
      </span>
      <span className="text-[10px] text-gray-900/40 dark:text-white/40">
        {info?.role ?? step.role}
      </span>

      {/* Status + verdict */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <StatusBadge status={step.status} />
        {step.verdict && <StatusBadge status={step.verdict} />}
      </div>

      {/* Metrics */}
      {(step.inputTokens > 0 || step.outputTokens > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <MetricPill label="In" value={formatTokens(step.inputTokens)} />
          <MetricPill label="Out" value={formatTokens(step.outputTokens)} />
          <MetricPill label="$" value={formatCost(Number(step.costUsd))} />
        </div>
      )}

      {step.durationMs != null && (
        <span className="text-[10px] text-gray-900/30 dark:text-white/30">
          {formatDuration(step.durationMs)}
        </span>
      )}

      {/* Error indicator */}
      {step.errorMessage && (
        <span className="max-w-full truncate rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] text-red-600 dark:text-red-400">
          Error
        </span>
      )}

      {/* View button */}
      {hasViewable && (
        <button
          onClick={onView}
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#5227FF]/10 px-3 py-1 text-[10px] font-medium text-[#5227FF] transition-colors hover:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
        >
          <Eye size={12} />
          View Output
        </button>
      )}
    </motion.div>
  );
}


// ---------------------------------------------------------------------------
// Sidebar: Step Output Viewer
// ---------------------------------------------------------------------------

function StepSidebarContent({
  step,
  relatedContent,
  copiedId,
  onCopy,
}: {
  step: PipelineStepFull;
  relatedContent?: GeneratedContentItem[];
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const info = MODEL_INFO[step.modelSlug];
  const contentType = step.inputSummary?.replace("generate:", "") ?? null;
  const hasOutput = step.output && Object.keys(step.output).length > 0;
  const hasIssues =
    step.issues && Array.isArray(step.issues) && step.issues.length > 0;

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <img
            src={info?.image ?? ""}
            alt={info?.name ?? step.modelSlug}
            className="h-8 w-8 rounded-full object-cover"
          />
          <div>
            <SheetTitle>
              {info?.name ?? step.modelSlug}
            </SheetTitle>
            <SheetDescription>
              {step.role === "generator" && contentType
                ? `Generator — ${titleCase(contentType.replace(/_/g, " "))}`
                : info?.role ?? step.role}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-4">
        {/* Status + metrics */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <StatusBadge status={step.status} />
          {step.verdict && <StatusBadge status={step.verdict} />}
        </div>

        {(step.inputTokens > 0 || step.outputTokens > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <MetricPill label="In" value={formatTokens(step.inputTokens)} />
            <MetricPill label="Out" value={formatTokens(step.outputTokens)} />
            <MetricPill label="Cost" value={formatCost(Number(step.costUsd))} />
            {step.durationMs != null && (
              <MetricPill label="Time" value={formatDuration(step.durationMs)} />
            )}
            {step.retryCount > 0 && (
              <MetricPill label="Retries" value={String(step.retryCount)} />
            )}
          </div>
        )}

        {step.startedAt && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-gray-900/30 dark:text-white/30">
            <span>Started: {formatDateTime(step.startedAt)}</span>
            {step.completedAt && (
              <span>Completed: {formatDateTime(step.completedAt)}</span>
            )}
          </div>
        )}

        {/* Error */}
        {step.errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-red-600/70 dark:text-red-400/70">
                Error
              </span>
              <CopyBtn
                text={`Step: ${step.modelSlug} (${step.role})\nError: ${step.errorMessage}`}
                id={`sb-err-${step.id}`}
                copiedId={copiedId}
                onCopy={onCopy}
              />
            </div>
            <p className="select-text break-words text-[10px] leading-relaxed text-red-600 dark:text-red-400">
              {step.errorMessage}
            </p>
          </div>
        )}

        {/* Issues */}
        {hasIssues && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                Issues ({(step.issues as unknown[]).length})
              </span>
              <CopyBtn
                text={JSON.stringify(step.issues, null, 2)}
                id={`sb-issues-${step.id}`}
                copiedId={copiedId}
                onCopy={onCopy}
              />
            </div>
            <div className="max-h-[300px] overflow-auto rounded-xl bg-amber-500/5 p-3">
              <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
                {JSON.stringify(step.issues, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Output */}
        {hasOutput && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
                Step Output
              </span>
              <CopyBtn
                text={JSON.stringify(step.output, null, 2)}
                id={`sb-output-${step.id}`}
                copiedId={copiedId}
                onCopy={onCopy}
              />
            </div>
            <div className="max-h-[40vh] overflow-auto rounded-xl bg-gray-900/[0.03] p-3 dark:bg-white/[0.03]">
              <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-gray-900/80 dark:text-white/80">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Generated Content for this content type */}
        {relatedContent && relatedContent.length > 0 && (
          <div className="border-t border-gray-900/10 pt-4 dark:border-white/10">
            <span className="mb-3 block text-center text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
              Generated Content ({relatedContent.length})
            </span>
            {relatedContent.map((item) => {
              const contentStr = item.content
                ? JSON.stringify(item.content, null, 2)
                : item.richText ?? "No content";

              return (
                <div
                  key={item.id}
                  className="mb-3 rounded-xl border border-gray-900/5 bg-gray-900/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.02]"
                >
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </span>
                    {item.isPublished ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Published
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
                    <MetricPill label="v" value={String(item.version)} />
                    <MetricPill label="Lang" value={item.language.toUpperCase()} />
                    {item.modelSource && (
                      <MetricPill label="Model" value={MODEL_INFO[item.modelSource]?.name ?? item.modelSource} />
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
                        Content
                      </span>
                      <CopyBtn
                        text={contentStr}
                        id={`sb-gc-${item.id}`}
                        copiedId={copiedId}
                        onCopy={onCopy}
                      />
                    </div>
                    <div className="max-h-[40vh] overflow-auto rounded-xl bg-gray-900/[0.03] p-3 dark:bg-white/[0.03]">
                      <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-gray-900/80 dark:text-white/80">
                        {contentStr}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Copy button helper
// ---------------------------------------------------------------------------

function CopyBtn({
  text,
  id,
  copiedId,
  onCopy,
}: {
  text: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="flex items-center gap-1 rounded-full bg-gray-900/5 px-1.5 py-0.5 text-[9px] font-medium text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
    >
      {copiedId === id ? <Check size={10} /> : <Copy size={10} />}
      {copiedId === id ? "Copied" : "Copy"}
    </button>
  );
}
