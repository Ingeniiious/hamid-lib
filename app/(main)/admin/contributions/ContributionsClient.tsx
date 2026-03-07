"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Files,
  GitPullRequest,
  Warning,
  Globe,
  Trash,
  CheckCircle,
  XCircle,
  Eye,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatsCard } from "@/components/admin/StatsCard";
import { DataTable } from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listContributions,
  reviewContribution,
  listContentRequests,
  reviewContentRequest,
  listUniversityDomains,
  addUniversityDomain,
  deleteUniversityDomain,
  lookupDomainRDAP,
  listReports,
  reviewReport,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Tab = "contributions" | "requests" | "reports" | "domains";

const statusBadge: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  under_review:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  dismissed:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

interface ContributionsClientProps {
  stats: {
    contributions: { pending: number; underReview: number; total: number };
    requests: { pending: number; total: number };
    reports: { pending: number; total: number };
    domains: { total: number };
  };
}

export function ContributionsClient({ stats }: ContributionsClientProps) {
  const [tab, setTab] = useState<Tab>("contributions");

  const pendingCount =
    stats.contributions.pending + stats.contributions.underReview;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "contributions", label: "Contributions", badge: pendingCount },
    { key: "requests", label: "Requests", badge: stats.requests.pending },
    { key: "reports", label: "Reports", badge: stats.reports.pending },
    { key: "domains", label: "Domains" },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Contributions"
          value={stats.contributions.total}
          icon={<Files size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Pending Requests"
          value={stats.requests.pending}
          icon={<GitPullRequest size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Pending Reports"
          value={stats.reports.pending}
          icon={<Warning size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="University Domains"
          value={stats.domains.total}
          icon={<Globe size={24} weight="duotone" />}
          index={3}
        />
      </div>

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
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                  : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      <div>
        {tab === "contributions" && <ContributionsTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "domains" && <DomainsTab />}
      </div>
    </div>
  );
}

// ── Status Filter ──

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
    <div className="mb-4 flex gap-1">
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
          {s || "All"}
        </button>
      ))}
    </div>
  );
}

// ==================
// Contributions Tab
// ==================

type ContributionRow = Awaited<
  ReturnType<typeof listContributions>
>["contributions"][number];

function ContributionsTab() {
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [reviewItem, setReviewItem] = useState<ContributionRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listContributions({
        status: filterStatus || undefined,
        page,
      });
      setContributions(result.contributions);
      setTotalPages(result.totalPages);
    });
  }, [page, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function handleReview(id: number, decision: "approved" | "rejected") {
    startTransition(async () => {
      await reviewContribution(id, decision, reviewNote);
      setReviewItem(null);
      setReviewNote("");
      load();
    });
  }

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (item: ContributionRow) => (
        <div className="min-w-0">
          <span className="font-medium">{item.title}</span>
          {item.fileUrl && (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-2 text-xs text-blue-500 hover:underline"
            >
              {item.fileName}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "contributorName",
      header: "Contributor",
      render: (item: ContributionRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.contributorName}
        </span>
      ),
    },
    {
      key: "courseTitle",
      header: "Course",
      render: (item: ContributionRow) => (
        <span className="text-gray-900/50 dark:text-white/50">
          {item.courseTitle || "\u2014"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (item: ContributionRow) => (
        <Badge variant="outline" className="text-xs capitalize">
          {item.type}
        </Badge>
      ),
    },
    {
      key: "reportCount",
      header: "Reports",
      render: (item: ContributionRow) => (
        <span
          className={
            item.reportCount > 0
              ? "font-medium text-red-500"
              : "text-gray-900/30 dark:text-white/30"
          }
        >
          {item.reportCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: ContributionRow) => (
        <Badge variant="secondary" className={statusBadge[item.status] || ""}>
          {item.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: ContributionRow) =>
        item.status === "pending" || item.status === "under_review" ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "approved");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-500/10 disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle size={18} weight="duotone" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "rejected");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              title="Reject"
            >
              <XCircle size={18} weight="duotone" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReviewItem(item);
              }}
              className="rounded-lg p-1.5 text-gray-900/40 transition-colors hover:bg-gray-900/5 dark:text-white/40 dark:hover:bg-white/5"
              title="Review With Note"
            >
              <Eye size={18} weight="duotone" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <StatusFilter
        options={["", "pending", "approved", "rejected", "under_review"]}
        value={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
      />

      <DataTable<ContributionRow>
        columns={columns}
        data={contributions}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isPending && contributions.length === 0}
        emptyMessage="No contributions yet."
      />

      {/* Review dialog */}
      <Dialog
        open={!!reviewItem}
        onOpenChange={(open) => {
          if (!open) {
            setReviewItem(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review: {reviewItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-900/60 dark:text-white/60">
              by {reviewItem?.contributorName} &middot;{" "}
              {reviewItem?.courseTitle || "No course"} &middot;{" "}
              {reviewItem?.type}
            </div>
            {reviewItem?.textContent && (
              <p className="max-h-32 overflow-auto rounded-xl bg-gray-900/5 p-3 text-xs text-gray-900/70 dark:bg-white/5 dark:text-white/70">
                {reviewItem.textContent}
              </p>
            )}
            <Textarea
              placeholder="Review note (optional)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  reviewItem && handleReview(reviewItem.id, "approved")
                }
                disabled={isPending}
                className="rounded-full bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  reviewItem && handleReview(reviewItem.id, "rejected")
                }
                disabled={isPending}
                className="rounded-full"
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================
// Requests Tab
// ==================

type RequestRow = Awaited<
  ReturnType<typeof listContentRequests>
>["requests"][number];

function RequestsTab() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [reviewItem, setReviewItem] = useState<RequestRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listContentRequests({
        status: filterStatus || undefined,
        page,
      });
      setRequests(result.requests);
      setTotalPages(result.totalPages);
    });
  }, [page, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function handleReview(id: number, decision: "approved" | "rejected") {
    startTransition(async () => {
      await reviewContentRequest(id, decision, reviewNote);
      setReviewItem(null);
      setReviewNote("");
      load();
    });
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: RequestRow) => (
        <span className="font-medium">
          {item.type === "faculty" ? item.facultyName : item.courseName}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (item: RequestRow) => (
        <Badge variant="outline" className="text-xs capitalize">
          {item.type}
        </Badge>
      ),
    },
    {
      key: "requesterName",
      header: "Requester",
      render: (item: RequestRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.requesterName}
        </span>
      ),
    },
    {
      key: "universityName",
      header: "University",
      render: (item: RequestRow) => (
        <span className="text-gray-900/50 dark:text-white/50">
          {item.universityName || "\u2014"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: RequestRow) => (
        <Badge variant="secondary" className={statusBadge[item.status] || ""}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: RequestRow) =>
        item.status === "pending" ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "approved");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-500/10 disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle size={18} weight="duotone" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "rejected");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              title="Reject"
            >
              <XCircle size={18} weight="duotone" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReviewItem(item);
              }}
              className="rounded-lg p-1.5 text-gray-900/40 transition-colors hover:bg-gray-900/5 dark:text-white/40 dark:hover:bg-white/5"
              title="Review With Note"
            >
              <Eye size={18} weight="duotone" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <StatusFilter
        options={["", "pending", "approved", "rejected"]}
        value={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
      />

      <DataTable<RequestRow>
        columns={columns}
        data={requests}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isPending && requests.length === 0}
        emptyMessage="No requests yet."
      />

      {/* Review dialog */}
      <Dialog
        open={!!reviewItem}
        onOpenChange={(open) => {
          if (!open) {
            setReviewItem(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Review:{" "}
              {reviewItem?.type === "faculty"
                ? reviewItem?.facultyName
                : reviewItem?.courseName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-900/60 dark:text-white/60">
              <span className="capitalize">{reviewItem?.type}</span> request by{" "}
              {reviewItem?.requesterName}
              {reviewItem?.universityName &&
                ` (${reviewItem.universityName})`}
              {reviewItem?.courseProfessor &&
                ` — Prof. ${reviewItem.courseProfessor}`}
              {reviewItem?.courseSemester &&
                ` — ${reviewItem.courseSemester}`}
            </div>
            <Textarea
              placeholder="Review note (optional)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  reviewItem && handleReview(reviewItem.id, "approved")
                }
                disabled={isPending}
                className="rounded-full bg-green-600 hover:bg-green-700"
              >
                Approve
                {reviewItem?.type === "faculty"
                  ? " & Create Faculty"
                  : " & Create Course"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  reviewItem && handleReview(reviewItem.id, "rejected")
                }
                disabled={isPending}
                className="rounded-full"
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================
// Reports Tab
// ==================

type ReportRow = Awaited<ReturnType<typeof listReports>>["reports"][number];

function ReportsTab() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listReports({
        status: filterStatus || undefined,
        page,
      });
      setReports(result.reports);
      setTotalPages(result.totalPages);
    });
  }, [page, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function handleReview(id: number, decision: "reviewed" | "dismissed") {
    startTransition(async () => {
      await reviewReport(id, decision);
      load();
    });
  }

  const columns = [
    {
      key: "reason",
      header: "Reason",
      render: (item: ReportRow) => (
        <span className="font-medium capitalize">{item.reason}</span>
      ),
    },
    {
      key: "contributionTitle",
      header: "Contribution",
      render: (item: ReportRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.contributionTitle || "\u2014"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item: ReportRow) => (
        <span className="line-clamp-1 max-w-[200px] text-xs text-gray-900/50 dark:text-white/50">
          {item.description || "\u2014"}
        </span>
      ),
    },
    {
      key: "evidence",
      header: "Evidence",
      render: (item: ReportRow) =>
        item.evidenceFileUrl ? (
          <a
            href={item.evidenceFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-500 hover:underline"
          >
            {item.evidenceFileName}
          </a>
        ) : (
          <span className="text-gray-900/30 dark:text-white/30">\u2014</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: ReportRow) => (
        <Badge variant="secondary" className={statusBadge[item.status] || ""}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: ReportRow) =>
        item.status === "pending" ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "reviewed");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-500/10 disabled:opacity-50"
              title="Mark Reviewed"
            >
              <CheckCircle size={18} weight="duotone" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReview(item.id, "dismissed");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-gray-900/40 transition-colors hover:bg-gray-900/5 disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/5"
              title="Dismiss"
            >
              <XCircle size={18} weight="duotone" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <StatusFilter
        options={["", "pending", "reviewed", "dismissed"]}
        value={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
      />

      <DataTable<ReportRow>
        columns={columns}
        data={reports}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isPending && reports.length === 0}
        emptyMessage="No reports yet."
      />
    </div>
  );
}

// ==================
// Domains Tab
// ==================

interface DomainRow {
  id: number;
  domain: string;
  universityName: string;
  country: string | null;
  createdAt: Date;
}

function DomainsTab() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Add form
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [addError, setAddError] = useState("");

  // RDAP lookup
  const [rdapResult, setRdapResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [rdapLoading, setRdapLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listUniversityDomains({
        search: debouncedSearch || undefined,
        page,
      });
      setDomains(result.domains as DomainRow[]);
      setTotalPages(result.totalPages);
    });
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleAdd() {
    setAddError("");
    startTransition(async () => {
      const result = await addUniversityDomain({
        universityName: newName,
        domain: newDomain,
        country: newCountry || undefined,
      });
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setNewName("");
      setNewDomain("");
      setNewCountry("");
      load();
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteUniversityDomain(id);
      load();
    });
  }

  async function handleRDAP(domain: string) {
    setRdapLoading(true);
    setRdapResult(null);
    const result = await lookupDomainRDAP(domain);
    setRdapResult(result as Record<string, unknown>);
    setRdapLoading(false);
  }

  const columns = [
    {
      key: "domain",
      header: "Domain",
      render: (item: DomainRow) => (
        <span className="font-medium">{item.domain}</span>
      ),
    },
    {
      key: "universityName",
      header: "University",
      render: (item: DomainRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.universityName}
        </span>
      ),
    },
    {
      key: "country",
      header: "Country",
      render: (item: DomainRow) => (
        <span className="text-gray-900/50 dark:text-white/50">
          {item.country || "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: DomainRow) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRDAP(item.domain);
            }}
            className="rounded-lg px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-500/10"
          >
            RDAP
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
          >
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          Add University Domain
        </h4>
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            placeholder="University Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Domain (e.g. university.edu)"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <Input
            placeholder="Country Code"
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={isPending || !newName || !newDomain}
              className="flex-1 rounded-full"
            >
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => newDomain && handleRDAP(newDomain)}
              disabled={rdapLoading || !newDomain}
              className="rounded-full"
            >
              RDAP
            </Button>
          </div>
        </div>
        {addError && (
          <p className="mt-2 text-xs text-red-500">{addError}</p>
        )}
        {rdapResult && (
          <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-gray-900/5 p-3 text-xs dark:bg-white/5">
            <pre className="whitespace-pre-wrap text-gray-900/70 dark:text-white/70">
              {JSON.stringify(rdapResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Domains table */}
      <DataTable<DomainRow>
        columns={columns}
        data={domains}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={handleSearch}
        searchPlaceholder="Search domains or universities..."
        loading={isPending && domains.length === 0}
        emptyMessage="No domains yet."
      />
    </div>
  );
}
