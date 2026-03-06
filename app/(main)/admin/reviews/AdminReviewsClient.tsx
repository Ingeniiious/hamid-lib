"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listProfessorReviews,
  moderateReview,
  listEnrollmentVerifications,
  moderateEnrollment,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type ReviewsOverview = {
  reviews: { pending: number; approved: number; rejected: number; total: number };
  enrollments: { pending: number; approved: number; rejected: number; total: number };
};

export function AdminReviewsClient({ overview }: { overview: ReviewsOverview }) {
  const [tab, setTab] = useState<"reviews" | "enrollments">("reviews");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
      <h1 className="font-display text-2xl font-light text-gray-900 dark:text-white">
        Professor Reviews
      </h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pending Reviews" value={overview.reviews.pending} />
        <StatCard label="Approved Reviews" value={overview.reviews.approved} />
        <StatCard label="Pending Enrollments" value={overview.enrollments.pending} />
        <StatCard label="Approved Enrollments" value={overview.enrollments.approved} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab("reviews")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "reviews"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          Reviews ({overview.reviews.pending} pending)
        </button>
        <button
          onClick={() => setTab("enrollments")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "enrollments"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          Enrollment Verifications ({overview.enrollments.pending} pending)
        </button>
      </div>

      {tab === "reviews" ? <ReviewsTab /> : <EnrollmentsTab />}
    </motion.div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ReviewsTab() {
  const [status, setStatus] = useState("pending");
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const result = await listProfessorReviews({ status, page });
    setReviews(result.reviews);
    setTotal(result.total);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [status, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function handleModerate(id: number, decision: "approved" | "rejected") {
    await moderateReview(id, decision);
    fetchReviews();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No {status} reviews.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{total} total</p>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {r.professorName}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {r.professorUniversity}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      By {r.reviewerName} · {r.courseName || "No course"} · Rating: {r.overallRating}/5 · Difficulty: {r.difficultyRating}/5
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    r.status === "pending" ? "bg-amber-100 text-amber-700" :
                    r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {r.status}
                  </span>
                </div>
                {r.reviewText && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {r.reviewText}
                  </p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleModerate(r.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleModerate(r.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EnrollmentsTab() {
  const [status, setStatus] = useState("pending");
  const [verifications, setVerifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    const result = await listEnrollmentVerifications({ status, page });
    setVerifications(result.verifications);
    setTotal(result.total);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [status, page]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  async function handleModerate(id: number, decision: "approved" | "rejected", note?: string) {
    await moderateEnrollment(id, decision, note);
    fetchVerifications();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : verifications.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No {status} enrollment verifications.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{total} total</p>
          <div className="space-y-3">
            {verifications.map((v) => (
              <EnrollmentCard
                key={v.id}
                verification={v}
                isPending={status === "pending"}
                onModerate={handleModerate}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EnrollmentCard({
  verification: v,
  isPending,
  onModerate,
}: {
  verification: any;
  isPending: boolean;
  onModerate: (id: number, decision: "approved" | "rejected", note?: string) => void;
}) {
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {v.studentName}
            <span className="ml-2 text-xs font-normal text-gray-400">
              wants to review {v.professorName}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Course: {v.courseName} · Semester: {v.semester} · University: {v.professorUniversity}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          v.status === "pending" ? "bg-amber-100 text-amber-700" :
          v.status === "approved" ? "bg-emerald-100 text-emerald-700" :
          "bg-red-100 text-red-700"
        }`}>
          {v.status}
        </span>
      </div>

      <div className="mt-2">
        <a
          href={v.proofFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          View Proof: {v.proofFileName}
        </a>
      </div>

      {v.reviewNote && (
        <p className="mt-2 text-xs text-gray-500">Note: {v.reviewNote}</p>
      )}

      {isPending && (
        <div className="mt-3">
          {showRejectForm ? (
            <div className="space-y-2">
              <Input
                placeholder="Reason for rejection (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => onModerate(v.id, "rejected", rejectNote)}>
                  Confirm Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onModerate(v.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectForm(true)}>
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
