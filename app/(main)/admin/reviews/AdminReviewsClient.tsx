"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Student,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/admin/StatsCard";
import { DataTable } from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listProfessorReviews,
  moderateReview,
  listEnrollmentVerifications,
  moderateEnrollment,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusBadge: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type ReviewsOverview = {
  reviews: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  enrollments: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
};

type Tab = "reviews" | "enrollments";

export function AdminReviewsClient({
  overview,
}: {
  overview: ReviewsOverview;
}) {
  const [tab, setTab] = useState<Tab>("reviews");

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "reviews", label: "Reviews", badge: overview.reviews.pending },
    {
      key: "enrollments",
      label: "Enrollments",
      badge: overview.enrollments.pending,
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pending Reviews"
          value={overview.reviews.pending}
          icon={<Star size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Approved Reviews"
          value={overview.reviews.approved}
          icon={<CheckCircle size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Pending Enrollments"
          value={overview.enrollments.pending}
          icon={<Student size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Approved Enrollments"
          value={overview.enrollments.approved}
          icon={<CheckCircle size={24} weight="duotone" />}
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
        {tab === "reviews" && <ReviewsTab />}
        {tab === "enrollments" && <EnrollmentsTab />}
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
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
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
// Reviews Tab
// ==================

type ReviewRow = Awaited<
  ReturnType<typeof listProfessorReviews>
>["reviews"][number];

function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [detailItem, setDetailItem] = useState<ReviewRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listProfessorReviews({
        status: filterStatus || undefined,
        page,
      });
      setReviews(result.reviews);
      setTotalPages(result.totalPages);
    });
  }, [page, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function handleModerate(id: number, decision: "approved" | "rejected") {
    startTransition(async () => {
      await moderateReview(id, decision);
      setDetailItem(null);
      load();
    });
  }

  const columns = [
    {
      key: "professorName",
      header: "Professor",
      render: (item: ReviewRow) => (
        <div>
          <span className="font-medium">{item.professorName}</span>
          <span className="ml-1.5 text-xs text-gray-900/40 dark:text-white/40">
            {item.professorUniversity}
          </span>
        </div>
      ),
    },
    {
      key: "reviewerName",
      header: "Reviewer",
      render: (item: ReviewRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.reviewerName}
        </span>
      ),
    },
    {
      key: "courseName",
      header: "Course",
      render: (item: ReviewRow) => (
        <span className="text-gray-900/50 dark:text-white/50">
          {item.courseName || "\u2014"}
        </span>
      ),
    },
    {
      key: "overallRating",
      header: "Rating",
      render: (item: ReviewRow) => (
        <span className="font-medium">
          {item.overallRating}/5
        </span>
      ),
    },
    {
      key: "difficultyRating",
      header: "Difficulty",
      render: (item: ReviewRow) => (
        <span className="text-gray-900/60 dark:text-white/60">
          {item.difficultyRating}/5
        </span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (item: ReviewRow) =>
        item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] dark:bg-white/10"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-[10px] text-gray-900/40 dark:text-white/40">
                +{item.tags.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-900/30 dark:text-white/30">{"\u2014"}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: ReviewRow) => (
        <Badge
          variant="secondary"
          className={statusBadge[item.status] || ""}
        >
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: ReviewRow) =>
        item.status === "pending" ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModerate(item.id, "approved");
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
                handleModerate(item.id, "rejected");
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              title="Reject"
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
        options={["", "pending", "approved", "rejected"]}
        value={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
      />

      <DataTable<ReviewRow>
        columns={columns}
        data={reviews}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={setDetailItem}
        loading={isPending && reviews.length === 0}
        emptyMessage="No reviews yet."
      />

      {/* Detail dialog */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Review of {detailItem?.professorName}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="text-sm text-gray-900/60 dark:text-white/60">
                by {detailItem.reviewerName} &middot;{" "}
                {detailItem.courseName || "No course"} &middot;{" "}
                {detailItem.professorUniversity}
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  Rating:{" "}
                  <strong>{detailItem.overallRating}/5</strong>
                </span>
                <span>
                  Difficulty:{" "}
                  <strong>{detailItem.difficultyRating}/5</strong>
                </span>
                <span>
                  Would Take Again:{" "}
                  <strong>
                    {detailItem.wouldTakeAgain ? "Yes" : "No"}
                  </strong>
                </span>
              </div>
              {detailItem.reviewText && (
                <p className="rounded-xl bg-gray-900/5 p-3 text-sm text-gray-900/70 dark:bg-white/5 dark:text-white/70">
                  {detailItem.reviewText}
                </p>
              )}
              {detailItem.tags && detailItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detailItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-900/5 px-2.5 py-1 text-xs dark:bg-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {detailItem.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      handleModerate(detailItem.id, "approved")
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
                      handleModerate(detailItem.id, "rejected")
                    }
                    disabled={isPending}
                    className="rounded-full"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================
// Enrollments Tab
// ==================

type EnrollmentRow = Awaited<
  ReturnType<typeof listEnrollmentVerifications>
>["verifications"][number];

function EnrollmentsTab() {
  const [verifications, setVerifications] = useState<EnrollmentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [rejectItem, setRejectItem] = useState<EnrollmentRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listEnrollmentVerifications({
        status: filterStatus || undefined,
        page,
      });
      setVerifications(result.verifications);
      setTotalPages(result.totalPages);
    });
  }, [page, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  function handleModerate(
    id: number,
    decision: "approved" | "rejected",
    note?: string
  ) {
    startTransition(async () => {
      await moderateEnrollment(id, decision, note);
      setRejectItem(null);
      setRejectNote("");
      load();
    });
  }

  const columns = [
    {
      key: "studentName",
      header: "Student",
      render: (item: EnrollmentRow) => (
        <span className="font-medium">{item.studentName}</span>
      ),
    },
    {
      key: "professorName",
      header: "Professor",
      render: (item: EnrollmentRow) => (
        <div>
          <span className="text-gray-900/70 dark:text-white/70">
            {item.professorName}
          </span>
          <span className="ml-1.5 text-xs text-gray-900/40 dark:text-white/40">
            {item.professorUniversity}
          </span>
        </div>
      ),
    },
    {
      key: "courseName",
      header: "Course",
      render: (item: EnrollmentRow) => (
        <span className="text-gray-900/60 dark:text-white/60">
          {item.courseName}
        </span>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      render: (item: EnrollmentRow) => (
        <span className="text-gray-900/50 dark:text-white/50">
          {item.semester}
        </span>
      ),
    },
    {
      key: "proof",
      header: "Proof",
      render: (item: EnrollmentRow) => (
        <a
          href={item.proofFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-500 hover:underline"
        >
          {item.proofFileName}
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: EnrollmentRow) => (
        <Badge
          variant="secondary"
          className={statusBadge[item.status] || ""}
        >
          {item.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: EnrollmentRow) =>
        item.status === "pending" ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleModerate(item.id, "approved");
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
                setRejectItem(item);
              }}
              disabled={isPending}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              title="Reject"
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
        options={["", "pending", "approved", "rejected"]}
        value={filterStatus}
        onChange={(v) => {
          setFilterStatus(v);
          setPage(1);
        }}
      />

      <DataTable<EnrollmentRow>
        columns={columns}
        data={verifications}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isPending && verifications.length === 0}
        emptyMessage="No enrollment verifications yet."
      />

      {/* Reject with note dialog */}
      <Dialog
        open={!!rejectItem}
        onOpenChange={(open) => {
          if (!open) {
            setRejectItem(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Enrollment</DialogTitle>
          </DialogHeader>
          {rejectItem && (
            <div className="space-y-4">
              <div className="text-sm text-gray-900/60 dark:text-white/60">
                {rejectItem.studentName} wants to review{" "}
                {rejectItem.professorName} ({rejectItem.courseName},{" "}
                {rejectItem.semester})
              </div>
              <Input
                placeholder="Reason for rejection (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    handleModerate(
                      rejectItem.id,
                      "rejected",
                      rejectNote
                    )
                  }
                  disabled={isPending}
                  className="rounded-full"
                >
                  Confirm Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejectItem(null);
                    setRejectNote("");
                  }}
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
