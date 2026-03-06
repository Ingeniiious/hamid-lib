"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listContributions,
  reviewContribution,
  listContentRequests,
  reviewContentRequest,
  listUniversityDomains,
  addUniversityDomain,
  deleteUniversityDomain,
  lookupDomainRDAP,
  getContributionOverview,
  listReports,
  reviewReport,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Tab = "contributions" | "requests" | "reports" | "domains";

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AdminContributionsPage() {
  const [tab, setTab] = useState<Tab>("contributions");
  const [overview, setOverview] = useState<{
    contributions: { pending: number; underReview: number; total: number };
    requests: { pending: number; total: number };
    reports: { pending: number; total: number };
  } | null>(null);

  useEffect(() => {
    getContributionOverview().then(setOverview);
  }, []);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    {
      key: "contributions",
      label: "Contributions",
      badge: overview ? overview.contributions.pending + overview.contributions.underReview : 0,
    },
    {
      key: "requests",
      label: "Requests",
      badge: overview?.requests.pending || 0,
    },
    {
      key: "reports",
      label: "Reports",
      badge: overview?.reports.pending || 0,
    },
    { key: "domains", label: "Domains" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="px-6 py-6"
    >
      <h1 className="font-display text-2xl font-light text-gray-900 dark:text-white">
        Contributions
      </h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-xl bg-gray-900/5 p-1 dark:bg-white/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
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

      <div className="mt-6">
        {tab === "contributions" && <ContributionsTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "domains" && <DomainsTab />}
      </div>
    </motion.div>
  );
}

// ==================
// Contributions Tab
// ==================

function ContributionsTab() {
  const [contributions, setContributions] = useState<
    Awaited<ReturnType<typeof listContributions>>["contributions"]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await listContributions({
        status: filterStatus || undefined,
        page,
      });
      setContributions(result.contributions);
      setTotalPages(result.totalPages);
    });
  }

  useEffect(() => {
    load();
  }, [page, filterStatus]);

  function handleReview(id: number, decision: "approved" | "rejected") {
    startTransition(async () => {
      await reviewContribution(id, decision, reviewNote);
      setReviewId(null);
      setReviewNote("");
      load();
    });
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {["", "pending", "approved", "rejected", "under_review"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilterStatus(s);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-900/5 text-gray-900/60 dark:bg-white/5 dark:text-white/60"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2">
        {contributions.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {c.title}
                </h4>
                <p className="mt-0.5 text-xs text-gray-900/40 dark:text-white/40">
                  by {c.contributorName} &middot;{" "}
                  {c.courseTitle || "No course"} &middot; {c.type}
                  {c.reportCount > 0 && (
                    <span className="ml-1 text-red-500">
                      ({c.reportCount} reports)
                    </span>
                  )}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={statusBadge[c.status] || ""}
              >
                {c.status.replace("_", " ")}
              </Badge>
            </div>

            {/* File preview or text preview */}
            {c.fileUrl && (
              <a
                href={c.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-blue-500 underline"
              >
                View File ({c.fileName})
              </a>
            )}
            {c.textContent && (
              <p className="mt-2 max-h-20 overflow-hidden text-xs text-gray-900/50 dark:text-white/50">
                {c.textContent.slice(0, 300)}
                {c.textContent.length > 300 && "..."}
              </p>
            )}

            {/* Review actions */}
            {c.status === "pending" || c.status === "under_review" ? (
              reviewId === c.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Review note (optional)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReview(c.id, "approved")}
                      disabled={isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(c.id, "rejected")}
                      disabled={isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewId(null);
                        setReviewNote("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setReviewId(c.id)}
                >
                  Review
                </Button>
              )
            ) : null}
          </div>
        ))}

        {contributions.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-900/40 dark:text-white/40">
            No contributions found.
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-900/50 dark:text-white/50">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ==================
// Requests Tab
// ==================

function RequestsTab() {
  const [requests, setRequests] = useState<
    Awaited<ReturnType<typeof listContentRequests>>["requests"]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await listContentRequests({
        status: filterStatus || undefined,
        page,
      });
      setRequests(result.requests);
      setTotalPages(result.totalPages);
    });
  }

  useEffect(() => {
    load();
  }, [page, filterStatus]);

  function handleReview(id: number, decision: "approved" | "rejected") {
    startTransition(async () => {
      await reviewContentRequest(id, decision, reviewNote);
      setReviewId(null);
      setReviewNote("");
      load();
    });
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilterStatus(s);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-900/5 text-gray-900/60 dark:bg-white/5 dark:text-white/60"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.type === "faculty"
                    ? `Faculty: ${r.facultyName}`
                    : `Course: ${r.courseName}`}
                </h4>
                <p className="mt-0.5 text-xs text-gray-900/40 dark:text-white/40">
                  by {r.requesterName}
                  {r.universityName && ` (${r.universityName})`}
                  {r.courseProfessor && ` — Prof. ${r.courseProfessor}`}
                  {r.courseSemester && ` — ${r.courseSemester}`}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={statusBadge[r.status] || ""}
              >
                {r.status}
              </Badge>
            </div>

            {r.status === "pending" &&
              (reviewId === r.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Review note (optional)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReview(r.id, "approved")}
                      disabled={isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                      {r.type === "faculty"
                        ? " & Create Faculty"
                        : " & Create Course"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(r.id, "rejected")}
                      disabled={isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewId(null);
                        setReviewNote("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setReviewId(r.id)}
                >
                  Review
                </Button>
              ))}
          </div>
        ))}

        {requests.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-900/40 dark:text-white/40">
            No requests found.
          </p>
        )}
      </div>
    </div>
  );
}

// ==================
// Reports Tab
// ==================

function ReportsTab() {
  const [reports, setReports] = useState<
    Awaited<ReturnType<typeof listReports>>["reports"]
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await listReports({
        status: filterStatus || undefined,
        page,
      });
      setReports(result.reports);
      setTotalPages(result.totalPages);
    });
  }

  useEffect(() => {
    load();
  }, [page, filterStatus]);

  function handleReview(id: number, decision: "reviewed" | "dismissed") {
    startTransition(async () => {
      await reviewReport(id, decision);
      load();
    });
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {["", "pending", "reviewed", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilterStatus(s);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-900/5 text-gray-900/60 dark:bg-white/5 dark:text-white/60"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Report: {r.reason}
                </h4>
                <p className="mt-0.5 text-xs text-gray-900/40 dark:text-white/40">
                  on &quot;{r.contributionTitle}&quot;
                </p>
                {r.description && (
                  <p className="mt-1 text-xs text-gray-900/50 dark:text-white/50">
                    {r.description}
                  </p>
                )}
                {r.evidenceFileUrl && (
                  <a
                    href={r.evidenceFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-blue-500 underline"
                  >
                    View Evidence ({r.evidenceFileName})
                  </a>
                )}
              </div>
              <Badge
                variant="secondary"
                className={statusBadge[r.status] || ""}
              >
                {r.status}
              </Badge>
            </div>

            {r.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReview(r.id, "reviewed")}
                  disabled={isPending}
                >
                  Mark Reviewed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReview(r.id, "dismissed")}
                  disabled={isPending}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        ))}

        {reports.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-900/40 dark:text-white/40">
            No reports found.
          </p>
        )}
      </div>
    </div>
  );
}

// ==================
// Domains Tab
// ==================

function DomainsTab() {
  const [domains, setDomains] = useState<
    Awaited<ReturnType<typeof listUniversityDomains>>["domains"]
  >([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
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

  function load() {
    startTransition(async () => {
      const result = await listUniversityDomains({
        search: search || undefined,
        page,
      });
      setDomains(result.domains);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    });
  }

  useEffect(() => {
    load();
  }, [page, search]);

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

  return (
    <div>
      {/* Add form */}
      <div className="mb-6 rounded-xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
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
              className="flex-1"
            >
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => newDomain && handleRDAP(newDomain)}
              disabled={rdapLoading || !newDomain}
            >
              RDAP
            </Button>
          </div>
        </div>
        {addError && (
          <p className="mt-2 text-xs text-red-500">{addError}</p>
        )}
        {rdapResult && (
          <div className="mt-3 max-h-40 overflow-auto rounded-lg bg-gray-900/5 p-3 text-xs dark:bg-white/5">
            <pre className="whitespace-pre-wrap text-gray-900/70 dark:text-white/70">
              {JSON.stringify(rdapResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Search domains or universities..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <span className="text-xs text-gray-900/40 dark:text-white/40">
          {total.toLocaleString()} domains
        </span>
      </div>

      {/* List */}
      <div className="space-y-1">
        {domains.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-900/5 dark:hover:bg-white/5"
          >
            <div>
              <span className="text-sm text-gray-900 dark:text-white">
                {d.domain}
              </span>
              <span className="ml-2 text-xs text-gray-900/40 dark:text-white/40">
                {d.universityName}
                {d.country && ` (${d.country})`}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleRDAP(d.domain)}
                className="rounded px-2 py-0.5 text-[11px] text-blue-500 hover:bg-blue-500/10"
              >
                RDAP
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="rounded px-2 py-0.5 text-[11px] text-red-500 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-900/50 dark:text-white/50">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
