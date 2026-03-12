"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Files,
  Lightning,
  CurrencyDollar,
  CheckCircle,
  Brain,
  Coins,
  FileText,
  ArrowsClockwise,
  UploadSimple,
  CircleNotch,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/admin/StatsCard";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "extraction" | "pipeline" | "models" | "test_lab";

interface Stats {
  total_extractions: number;
  completed_extractions: number;
  failed_extractions: number;
  active_extractions: number;
  total_extraction_tokens: number;
  total_extraction_cost: number;
  total_pipelines: number;
  completed_pipelines: number;
  failed_pipelines: number;
  active_pipelines: number;
  total_pipeline_tokens: number;
  total_pipeline_cost: number;
  total_generated: number;
  published_content: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ExtractionJob {
  id: string;
  contributionId: number;
  courseId: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  status: string;
  currentPhase: number;
  totalImages: number;
  processedImages: number;
  extractionTokens: number;
  extractionCostUsd: string;
  errorMessage: string | null;
  retryCount: number;
  pipelineJobId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface PipelineJob {
  id: string;
  courseId: string;
  status: string;
  currentStep: number;
  outputTypes: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: string;
  errorMessage: string | null;
  retryCount: number;
  version: number;
  startedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface PipelineStepData {
  id: number;
  modelSlug: string;
  role: string;
  stepOrder: number;
  status: string;
  verdict: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  durationMs: number | null;
  errorMessage: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusBadge: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  downloading:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  extracting:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  classifying:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  running:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewing:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  enriching:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  validating:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  fact_checking:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  publishing:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  skipped:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  needs_changes:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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

const EXTRACTION_STATUSES = [
  "",
  "pending",
  "downloading",
  "extracting",
  "classifying",
  "completed",
  "failed",
];
const PIPELINE_STATUSES = [
  "",
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AICouncilClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Extraction jobs state
  const [extractionJobs, setExtractionJobs] = useState<ExtractionJob[]>([]);
  const [extractionPagination, setExtractionPagination] =
    useState<Pagination | null>(null);
  const [extractionPage, setExtractionPage] = useState(1);
  const [extractionFilter, setExtractionFilter] = useState("");
  const [extractionLoading, setExtractionLoading] = useState(false);

  // Pipeline jobs state
  const [pipelineJobs, setPipelineJobs] = useState<PipelineJob[]>([]);
  const [pipelinePagination, setPipelinePagination] =
    useState<Pagination | null>(null);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<PipelineStepData[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-council/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats({
        total_extractions: Number(data.total_extractions ?? 0),
        completed_extractions: Number(data.completed_extractions ?? 0),
        failed_extractions: Number(data.failed_extractions ?? 0),
        active_extractions: Number(data.active_extractions ?? 0),
        total_extraction_tokens: Number(data.total_extraction_tokens ?? 0),
        total_extraction_cost: Number(data.total_extraction_cost ?? 0),
        total_pipelines: Number(data.total_pipelines ?? 0),
        completed_pipelines: Number(data.completed_pipelines ?? 0),
        failed_pipelines: Number(data.failed_pipelines ?? 0),
        active_pipelines: Number(data.active_pipelines ?? 0),
        total_pipeline_tokens: Number(data.total_pipeline_tokens ?? 0),
        total_pipeline_cost: Number(data.total_pipeline_cost ?? 0),
        total_generated: Number(data.total_generated ?? 0),
        published_content: Number(data.published_content ?? 0),
      });
      setStatsError(null);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch extraction jobs
  const fetchExtractionJobs = useCallback(async () => {
    setExtractionLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(extractionPage),
        limit: "20",
        status: extractionFilter || "all",
      });
      const res = await fetch(
        `/api/admin/ai-council/extraction-jobs?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch extraction jobs");
      const data = await res.json();
      setExtractionJobs(data.jobs ?? []);
      setExtractionPagination(data.pagination ?? null);
    } catch {
      setExtractionJobs([]);
    } finally {
      setExtractionLoading(false);
    }
  }, [extractionPage, extractionFilter]);

  // Fetch pipeline jobs
  const fetchPipelineJobs = useCallback(async () => {
    setPipelineLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pipelinePage),
        limit: "20",
        status: pipelineFilter || "all",
      });
      const res = await fetch(
        `/api/admin/ai-council/pipeline-jobs?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch pipeline jobs");
      const data = await res.json();
      setPipelineJobs(data.jobs ?? []);
      setPipelinePagination(data.pagination ?? null);
    } catch {
      setPipelineJobs([]);
    } finally {
      setPipelineLoading(false);
    }
  }, [pipelinePage, pipelineFilter]);

  // Fetch pipeline steps for expanded job
  const fetchSteps = useCallback(async (jobId: string) => {
    setStepsLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1",
        expand: jobId,
      });
      const res = await fetch(
        `/api/admin/ai-council/pipeline-jobs?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch steps");
      const data = await res.json();
      setExpandedSteps(data.steps ?? []);
    } catch {
      setExpandedSteps([]);
    } finally {
      setStepsLoading(false);
    }
  }, []);

  // Initial stats fetch + auto-refresh every 30s
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Fetch tab data when tab changes
  useEffect(() => {
    if (activeTab === "extraction") fetchExtractionJobs();
    if (activeTab === "pipeline") fetchPipelineJobs();
  }, [activeTab, fetchExtractionJobs, fetchPipelineJobs]);

  // Handle expanding a pipeline job
  const handleExpandJob = useCallback(
    (jobId: string) => {
      if (expandedJobId === jobId) {
        setExpandedJobId(null);
        setExpandedSteps([]);
      } else {
        setExpandedJobId(jobId);
        fetchSteps(jobId);
      }
    },
    [expandedJobId, fetchSteps]
  );

  const tabs: { key: TabId; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "extraction", label: "Extraction Jobs" },
    { key: "pipeline", label: "Pipeline Jobs" },
    { key: "models", label: "Models" },
    { key: "test_lab", label: "Test Lab" },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
      >
        <div className="inline-flex gap-1 rounded-full border border-gray-900/10 bg-white/50 p-1 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                  : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            loading={statsLoading}
            error={statsError}
          />
        )}

        {activeTab === "extraction" && (
          <ExtractionTab
            jobs={extractionJobs}
            pagination={extractionPagination}
            loading={extractionLoading}
            filter={extractionFilter}
            onFilterChange={(s) => {
              setExtractionFilter(s);
              setExtractionPage(1);
            }}
            page={extractionPage}
            onPageChange={setExtractionPage}
          />
        )}

        {activeTab === "pipeline" && (
          <PipelineTab
            jobs={pipelineJobs}
            pagination={pipelinePagination}
            loading={pipelineLoading}
            filter={pipelineFilter}
            onFilterChange={(s) => {
              setPipelineFilter(s);
              setPipelinePage(1);
            }}
            page={pipelinePage}
            onPageChange={setPipelinePage}
            expandedJobId={expandedJobId}
            expandedSteps={expandedSteps}
            stepsLoading={stepsLoading}
            onExpandJob={handleExpandJob}
          />
        )}

        {activeTab === "models" && <ModelsTab />}

        {activeTab === "test_lab" && <TestLabTab />}
      </div>
    </div>
  );
}

// ===========================================================================
// Status Filter (matching ContributionsClient pattern)
// ===========================================================================

function StatusFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {options.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === s
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-900/5 text-gray-900/60 hover:text-gray-900 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
          }`}
        >
          {s === "" ? "All" : titleCase(s.replace(/_/g, " "))}
        </button>
      ))}
    </div>
  );
}

// ===========================================================================
// Tab 1: Overview
// ===========================================================================

function OverviewTab({
  stats,
  loading,
  error,
}: {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="mt-1 text-xs text-gray-900/50 dark:text-white/50">
          Stats will retry automatically every 30 seconds.
        </p>
      </div>
    );
  }

  const totalTokens =
    (stats?.total_extraction_tokens ?? 0) +
    (stats?.total_pipeline_tokens ?? 0);
  const totalCost =
    (stats?.total_extraction_cost ?? 0) + (stats?.total_pipeline_cost ?? 0);
  const totalJobs =
    (stats?.total_extractions ?? 0) + (stats?.total_pipelines ?? 0);
  const completedJobs =
    (stats?.completed_extractions ?? 0) + (stats?.completed_pipelines ?? 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Extraction Jobs"
          value={loading ? 0 : stats?.total_extractions ?? 0}
          icon={<Files size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Pipeline Jobs"
          value={loading ? 0 : stats?.total_pipelines ?? 0}
          icon={<Brain size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Published Content"
          value={loading ? 0 : stats?.published_content ?? 0}
          icon={<CheckCircle size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Active Jobs"
          value={
            loading
              ? 0
              : (stats?.active_extractions ?? 0) +
                (stats?.active_pipelines ?? 0)
          }
          icon={<Lightning size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tokens"
          value={loading ? 0 : totalTokens}
          icon={<Coins size={24} weight="duotone" />}
          index={4}
        />
        <StatsCard
          title="Total Cost (USD)"
          value={loading ? 0 : Math.round(totalCost * 10000) / 10000}
          icon={<CurrencyDollar size={24} weight="duotone" />}
          index={5}
        />
        <StatsCard
          title="Generated Content"
          value={loading ? 0 : stats?.total_generated ?? 0}
          icon={<FileText size={24} weight="duotone" />}
          index={6}
        />
        <StatsCard
          title="Success Rate"
          value={
            loading
              ? 0
              : totalJobs > 0
                ? Math.round((completedJobs / totalJobs) * 100)
                : 0
          }
          icon={<ArrowsClockwise size={24} weight="duotone" />}
          index={7}
        />
      </div>

      {/* Pipeline Models */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.8 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <h3 className="mb-4 font-display text-lg font-light text-gray-900 dark:text-white">
          Pipeline Models
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(MODEL_INFO).map(([slug, model], idx) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 + idx * 0.06, ease }}
              className="rounded-xl border border-gray-900/5 bg-gray-900/[0.02] p-4 text-center dark:border-white/5 dark:bg-white/[0.02]"
            >
              <img
                src={model.image}
                alt={model.name}
                className="mx-auto h-10 w-10 rounded-full object-cover"
              />
              <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {model.name}
              </div>
              <div className="text-xs text-gray-900/50 dark:text-white/50">
                {model.provider}
              </div>
              <span
                className="mt-1 inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: model.color + "18",
                  color: model.color,
                }}
              >
                {model.role}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ===========================================================================
// Tab 2: Extraction Jobs
// ===========================================================================

function ExtractionTab({
  jobs,
  pagination,
  loading,
  filter,
  onFilterChange,
  page,
  onPageChange,
}: {
  jobs: ExtractionJob[];
  pagination: Pagination | null;
  loading: boolean;
  filter: string;
  onFilterChange: (s: string) => void;
  page: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="space-y-4">
      <StatusFilter
        options={EXTRACTION_STATUSES}
        value={filter}
        onChange={onFilterChange}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <p className="text-sm text-gray-900/40 dark:text-white/40">
            No extraction jobs found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.03, ease }}
              className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              {/* Top Row */}
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
                  <span
                    className="max-w-[250px] truncate text-sm font-medium text-gray-900 dark:text-white"
                    title={job.fileName}
                  >
                    {job.fileName}
                  </span>
                  <Badge variant="outline" className="text-xs uppercase">
                    {job.fileType}
                  </Badge>
                </div>
                <StatusBadge status={job.status} />
              </div>

              {/* Metrics */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <MetricPill
                  label="Phase"
                  value={`${job.currentPhase}/2`}
                />
                <MetricPill
                  label="Images"
                  value={`${job.processedImages}/${job.totalImages}`}
                />
                <MetricPill
                  label="Tokens"
                  value={formatTokens(job.extractionTokens)}
                />
                <MetricPill
                  label="Cost"
                  value={formatCost(Number(job.extractionCostUsd))}
                />
                {job.retryCount > 0 && (
                  <MetricPill
                    label="Retries"
                    value={String(job.retryCount)}
                  />
                )}
                <MetricPill
                  label="Created"
                  value={formatRelativeTime(job.createdAt)}
                />
              </div>

              {/* Error */}
              {job.status === "failed" && job.errorMessage && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-center">
                  <p className="break-words text-xs text-red-600 dark:text-red-400">
                    {job.errorMessage}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange(Math.min(pagination.totalPages, page + 1))
            }
            disabled={page >= pagination.totalPages}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Tab 3: Pipeline Jobs
// ===========================================================================

function PipelineTab({
  jobs,
  pagination,
  loading,
  filter,
  onFilterChange,
  page,
  onPageChange,
  expandedJobId,
  expandedSteps,
  stepsLoading,
  onExpandJob,
}: {
  jobs: PipelineJob[];
  pagination: Pagination | null;
  loading: boolean;
  filter: string;
  onFilterChange: (s: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  expandedJobId: string | null;
  expandedSteps: PipelineStepData[];
  stepsLoading: boolean;
  onExpandJob: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <StatusFilter
        options={PIPELINE_STATUSES}
        value={filter}
        onChange={onFilterChange}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <p className="text-sm text-gray-900/40 dark:text-white/40">
            No pipeline jobs found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, idx) => {
            const isExpanded = expandedJobId === job.id;
            const outputTypes = Array.isArray(job.outputTypes)
              ? job.outputTypes
              : [];

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.03, ease }}
                className="overflow-hidden rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
              >
                {/* Main row - clickable */}
                <button
                  onClick={() => onExpandJob(job.id)}
                  className="w-full p-4 text-center transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5"
                >
                  {/* Top: ID + Status */}
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                    <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {job.id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-900/50 dark:text-white/50">
                        Course: {job.courseId.slice(0, 12)}
                        {job.courseId.length > 12 ? "..." : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={job.status} />
                      <span className="text-xs text-gray-900/40 dark:text-white/40">
                        {isExpanded ? "Collapse" : "Expand"}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <MetricPill
                      label="Step"
                      value={`${job.currentStep}/5`}
                    />
                    <MetricPill
                      label="Tokens In"
                      value={formatTokens(job.totalInputTokens)}
                    />
                    <MetricPill
                      label="Tokens Out"
                      value={formatTokens(job.totalOutputTokens)}
                    />
                    <MetricPill
                      label="Cost"
                      value={formatCost(Number(job.totalCostUsd))}
                    />
                    <MetricPill label="v" value={String(job.version)} />
                    <MetricPill
                      label="Created"
                      value={formatRelativeTime(job.createdAt)}
                    />
                  </div>

                  {/* Output types */}
                  {outputTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                      {outputTypes.map((type) => (
                        <span
                          key={type}
                          className="rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#5227FF]"
                        >
                          {titleCase(type.replace(/_/g, " "))}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {job.status === "failed" && job.errorMessage && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <p className="break-words text-xs text-red-600 dark:text-red-400">
                        {job.errorMessage}
                      </p>
                    </div>
                  )}
                </button>

                {/* Expanded Steps */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease }}
                    className="border-t border-gray-900/10 bg-gray-900/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <h4 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-900/50 dark:text-white/50">
                      Pipeline Steps
                    </h4>
                    {stepsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : expandedSteps.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-900/40 dark:text-white/40">
                        No steps recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {expandedSteps.map((step) => {
                          const info = MODEL_INFO[step.modelSlug];
                          return (
                            <div
                              key={step.id}
                              className="rounded-xl border border-gray-900/5 bg-white/50 p-3 dark:border-white/5 dark:bg-white/5"
                            >
                              <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={info?.image ?? ""}
                                    alt={info?.name ?? step.modelSlug}
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {info?.name ?? step.modelSlug}
                                  </span>
                                  <span className="text-xs text-gray-900/50 dark:text-white/50">
                                    {info?.role ?? step.role}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={step.status} />
                                  {step.verdict && (
                                    <StatusBadge status={step.verdict} />
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                                <MetricPill
                                  label="In"
                                  value={formatTokens(step.inputTokens)}
                                />
                                <MetricPill
                                  label="Out"
                                  value={formatTokens(step.outputTokens)}
                                />
                                <MetricPill
                                  label="Cost"
                                  value={formatCost(Number(step.costUsd))}
                                />
                                {step.durationMs != null && (
                                  <MetricPill
                                    label="Time"
                                    value={formatDuration(step.durationMs)}
                                  />
                                )}
                                {step.retryCount > 0 && (
                                  <MetricPill
                                    label="Retries"
                                    value={String(step.retryCount)}
                                  />
                                )}
                              </div>
                              {step.errorMessage && (
                                <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1">
                                  <p className="break-words text-[10px] text-red-600 dark:text-red-400">
                                    {step.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange(Math.min(pagination.totalPages, page + 1))
            }
            disabled={page >= pagination.totalPages}
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Tab 4: Models
// ===========================================================================

function ModelsTab() {
  const models = [
    {
      slug: "kimi",
      name: "Kimi K2.5",
      provider: "Moonshot AI",
      modelId: "kimi-2.5",
      role: "Creator",
      pipelineOrder: 1,
      costPerInputToken: "0.0000006000",
      costPerOutputToken: "0.0000030000",
      maxInputTokens: 128000,
      maxOutputTokens: 8192,
      enabled: true,
      color: "#3B82F6",
      description:
        "Extracts and generates initial structured content from student-contributed source material. Handles 90% of token work at ~1/10th the price.",
    },
    {
      slug: "chatgpt",
      name: "GPT-5.4",
      provider: "OpenAI",
      modelId: "gpt-5.4",
      role: "Reviewer",
      pipelineOrder: 2,
      costPerInputToken: "0.0000025000",
      costPerOutputToken: "0.0000150000",
      maxInputTokens: 1050000,
      maxOutputTokens: 128000,
      enabled: true,
      color: "#10B981",
      description:
        "Reviews for accuracy, completeness, clarity, and pedagogical quality. Catches factual errors the creator may have introduced.",
    },
    {
      slug: "claude",
      name: "Claude Opus 4.6",
      provider: "Anthropic",
      modelId: "claude-opus-4-6",
      role: "Enricher",
      pipelineOrder: 3,
      costPerInputToken: "0.0000050000",
      costPerOutputToken: "0.0000250000",
      maxInputTokens: 200000,
      maxOutputTokens: 32768,
      enabled: true,
      color: "#D97706",
      description:
        "Enriches with examples, explanations, and polish while preserving factual accuracy. Adds depth and nuance.",
    },
    {
      slug: "gemini",
      name: "Gemini 3.1 Pro",
      provider: "Google",
      modelId: "gemini-3.1-pro-preview",
      role: "Validator",
      pipelineOrder: 4,
      costPerInputToken: "0.0000012500",
      costPerOutputToken: "0.0000050000",
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      enabled: true,
      color: "#8B5CF6",
      description:
        "Validates factual accuracy and internal consistency across all content. Cross-references with known truths.",
    },
    {
      slug: "grok",
      name: "Grok 4.20",
      provider: "xAI",
      modelId: "grok-4.20-beta-0309-non-reasoning",
      role: "Fact Checker",
      pipelineOrder: 5,
      costPerInputToken: "0.0000020000",
      costPerOutputToken: "0.0000060000",
      maxInputTokens: 2000000,
      maxOutputTokens: 131072,
      enabled: true,
      color: "#EF4444",
      description:
        "Cross-references claims against real-world knowledge for final verification. The last line of defense.",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-gray-900/50 dark:text-white/50">
        Model configurations from the ai_model_config table. Pipeline order
        determines execution sequence.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((model, idx) => (
          <motion.div
            key={model.slug}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: idx * 0.06, ease }}
            className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={`${TEACHER_IMG_BASE}/${model.slug}.webp`}
                alt={model.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="text-base font-medium text-gray-900 dark:text-white">
                {model.name}
              </div>
              <div className="text-xs text-gray-900/50 dark:text-white/50">
                {model.provider}
              </div>
              <span
                className="inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: model.color + "18",
                  color: model.color,
                }}
              >
                {model.role}
              </span>
            </div>

            {/* Description */}
            <p className="mt-4 text-center text-xs leading-relaxed text-gray-900/60 dark:text-white/60">
              {model.description}
            </p>

            {/* Details */}
            <div className="mt-4 space-y-1.5">
              <DetailRow label="Model ID" value={model.modelId} />
              <DetailRow
                label="Input Cost"
                value={`$${Number(model.costPerInputToken).toFixed(10)}/token`}
              />
              <DetailRow
                label="Output Cost"
                value={`$${Number(model.costPerOutputToken).toFixed(10)}/token`}
              />
              <DetailRow
                label="Max Input"
                value={formatTokens(model.maxInputTokens)}
              />
              <DetailRow
                label="Max Output"
                value={formatTokens(model.maxOutputTokens)}
              />
            </div>

            {/* Enabled Badge */}
            <div className="mt-4 text-center">
              <span
                className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold ${
                  model.enabled
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {model.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Tab 5: Test Lab
// ===========================================================================

const ALL_CONTENT_TYPES: { value: string; label: string }[] = [
  { value: "study_guide", label: "Study Guide" },
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "mock_exam", label: "Mock Exam" },
  { value: "podcast_script", label: "Podcast Script" },
  { value: "video_script", label: "Video Script" },
  { value: "mind_map", label: "Mind Map" },
  { value: "infographic_data", label: "Infographic" },
  { value: "slide_deck", label: "Slide Deck" },
  { value: "data_table", label: "Data Table" },
  { value: "report", label: "Report" },
  { value: "interactive_section", label: "Interactive Section" },
];

function TestLabTab() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(["study_guide", "flashcards", "quiz"])
  );
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    mode?: string;
    extractionJobId?: string;
    pipelineJobId?: string;
    fileUrl?: string;
    error?: string;
  } | null>(null);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedTypes(new Set(ALL_CONTENT_TYPES.map((t) => t.value)));
  const clearAll = () => setSelectedTypes(new Set());

  const handleUpload = async () => {
    if (!file || selectedTypes.size === 0) return;
    setUploading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("outputTypes", [...selectedTypes].join(","));

      const res = await fetch("/api/admin/ai-council/test-upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, error: data.error });
      } else {
        setResult({ success: true, ...data });
      }
    } catch (e) {
      setResult({
        success: false,
        error: (e as Error).message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
      >
        <p className="text-center text-xs text-gray-900/50 dark:text-white/50">
          Upload a PDF, DOCX, PPTX, or image to test the full extraction +
          council pipeline. The file will go through the same flow as a real
          student contribution.
        </p>
      </motion.div>

      {/* File Drop Zone */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.1 }}
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors ${
            dragOver
              ? "border-[#5227FF] bg-[#5227FF]/5"
              : file
                ? "border-green-400 bg-green-50/50 dark:border-green-500/40 dark:bg-green-900/10"
                : "border-gray-900/10 bg-white/50 hover:border-gray-900/20 dark:border-white/15 dark:bg-white/5 dark:hover:border-white/25"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
          {file ? (
            <>
              <FileText
                weight="duotone"
                className="h-8 w-8 text-green-600 dark:text-green-400"
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </div>
                <div className="text-xs text-gray-900/50 dark:text-white/50">
                  {(file.size / 1024 / 1024).toFixed(2)} MB &middot;{" "}
                  {file.type.split("/").pop()?.toUpperCase()}
                </div>
              </div>
              <span className="text-xs text-gray-900/40 dark:text-white/40">
                Click Or Drop To Replace
              </span>
            </>
          ) : (
            <>
              <UploadSimple
                weight="duotone"
                className="h-8 w-8 text-gray-900/30 dark:text-white/30"
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900/70 dark:text-white/70">
                  Drop File Here Or Click To Browse
                </div>
                <div className="text-xs text-gray-900/40 dark:text-white/40">
                  PDF, DOCX, PPTX, PNG, JPEG, WebP
                </div>
              </div>
            </>
          )}
        </label>
      </motion.div>

      {/* Output Type Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.2 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <div className="mb-3 flex items-center justify-center gap-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Output Types
          </h3>
          <div className="flex gap-1.5">
            <button
              onClick={selectAll}
              className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              All
            </button>
            <button
              onClick={clearAll}
              className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {ALL_CONTENT_TYPES.map((ct) => {
            const selected = selectedTypes.has(ct.value);
            return (
              <button
                key={ct.value}
                onClick={() => toggleType(ct.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  selected
                    ? "bg-[#5227FF] text-white shadow-sm"
                    : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                }`}
              >
                {ct.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[10px] text-gray-900/40 dark:text-white/40">
          {selectedTypes.size} of {ALL_CONTENT_TYPES.length} selected &mdash;
          each type will be generated by the council pipeline
        </p>
      </motion.div>

      {/* Upload Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.3 }}
        className="text-center"
      >
        <Button
          onClick={handleUpload}
          disabled={!file || selectedTypes.size === 0 || uploading}
          className="rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
              Uploading &amp; Creating Jobs...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lightning weight="duotone" className="h-4 w-4" />
              Start Pipeline Test
            </span>
          )}
        </Button>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
          className={`rounded-2xl border p-5 text-center ${
            result.success
              ? "border-green-400/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10"
              : "border-red-400/30 bg-red-50/50 dark:border-red-500/20 dark:bg-red-900/10"
          }`}
        >
          {result.success ? (
            <div className="space-y-3">
              <CheckCircle
                weight="duotone"
                className="mx-auto h-8 w-8 text-green-600 dark:text-green-400"
              />
              <div className="text-sm font-medium text-green-700 dark:text-green-300">
                Jobs Created Successfully
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {result.extractionJobId && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-mono text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Extraction: {result.extractionJobId.slice(0, 8)}...
                  </span>
                )}
                {result.pipelineJobId && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-mono text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Pipeline: {result.pipelineJobId.slice(0, 8)}...
                  </span>
                )}
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">
                {result.mode === "extraction-pipeline"
                  ? "File queued for extraction. The cron will pick it up within 2 minutes, then auto-create the council pipeline job."
                  : "Pipeline job created directly. The cron will start processing within 2 minutes."}
              </p>
              <p className="text-[10px] text-gray-900/40 dark:text-white/40">
                Switch to the{" "}
                {result.mode === "extraction-pipeline"
                  ? "Extraction Jobs"
                  : "Pipeline Jobs"}{" "}
                tab to monitor progress.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-red-700 dark:text-red-300">
                Upload Failed
              </div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                {result.error}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Pipeline Flow Visual */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.4 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <h3 className="mb-4 text-center text-sm font-medium text-gray-900 dark:text-white">
          Pipeline Flow
        </h3>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-0">
          {/* Upload step */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/5 dark:bg-white/5">
              <UploadSimple
                weight="duotone"
                className="h-5 w-5 text-gray-900/50 dark:text-white/50"
              />
            </div>
            <span className="text-[10px] text-gray-900/50 dark:text-white/50">
              Upload
            </span>
          </div>

          <div className="hidden h-px w-6 bg-gray-900/10 dark:bg-white/10 sm:block" />
          <div className="block h-4 w-px bg-gray-900/10 dark:bg-white/10 sm:hidden" />

          {/* Extraction step */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/5 dark:bg-white/5">
              <Files
                weight="duotone"
                className="h-5 w-5 text-gray-900/50 dark:text-white/50"
              />
            </div>
            <span className="text-[10px] text-gray-900/50 dark:text-white/50">
              Extract
            </span>
          </div>

          <div className="hidden h-px w-4 bg-gray-900/10 dark:bg-white/10 sm:block" />
          <div className="block h-4 w-px bg-gray-900/10 dark:bg-white/10 sm:hidden" />

          {/* 5 teacher avatars */}
          {Object.entries(MODEL_INFO).map(([slug, model], idx) => (
            <div key={slug} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <img
                  src={model.image}
                  alt={model.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="text-[10px] text-gray-900/50 dark:text-white/50">
                  {model.role}
                </span>
              </div>
              {idx < 4 && (
                <>
                  <div className="hidden h-px w-4 bg-gray-900/10 dark:bg-white/10 sm:block" />
                </>
              )}
            </div>
          ))}

          <div className="hidden h-px w-4 bg-gray-900/10 dark:bg-white/10 sm:block" />
          <div className="block h-4 w-px bg-gray-900/10 dark:bg-white/10 sm:hidden" />

          {/* Published */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle
                weight="duotone"
                className="h-5 w-5 text-green-600 dark:text-green-400"
              />
            </div>
            <span className="text-[10px] text-green-600 dark:text-green-400">
              Publish
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ===========================================================================
// Shared Components
// ===========================================================================

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
    status === "classifying";

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-900/50 dark:text-white/50">{label}</span>
      <span className="font-mono text-[11px] text-gray-900/70 dark:text-white/70">
        {value}
      </span>
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
