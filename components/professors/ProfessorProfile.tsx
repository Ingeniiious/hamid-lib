"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const AVATARS = [
  "https://lib.thevibecodedcompany.com/images/ghost-teacher.webp",
  "https://lib.thevibecodedcompany.com/images/female-teacher.webp",
  "https://lib.thevibecodedcompany.com/images/male-teacher.webp",
];

function getAvatar(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(hash) % AVATARS.length];
}
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { EnrollmentForm } from "./EnrollmentForm";
import { getReviewEligibility } from "@/app/(public)/professors/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Professor = {
  id: number;
  name: string;
  slug: string;
  university: string;
  department: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    avgOverall: number;
    avgDifficulty: number;
    reviewCount: number;
    wouldTakeAgainPct: number;
    distribution: number[];
  };
  reviews: Array<{
    id: number;
    overallRating: number;
    difficultyRating: number;
    wouldTakeAgain: boolean;
    reviewText: string | null;
    tags: string[] | null;
    courseName: string | null;
    createdAt: string;
  }>;
};

type Eligibility = Awaited<ReturnType<typeof getReviewEligibility>>;

function ratingColor(avg: number) {
  if (avg >= 4) return "bg-emerald-500";
  if (avg >= 3) return "bg-amber-500";
  if (avg >= 2) return "bg-orange-500";
  if (avg > 0) return "bg-red-500";
  return "bg-gray-300 dark:bg-gray-600";
}

function ratingTextColor(avg: number) {
  if (avg >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (avg >= 3) return "text-amber-600 dark:text-amber-400";
  if (avg >= 2) return "text-orange-600 dark:text-orange-400";
  if (avg > 0) return "text-red-600 dark:text-red-400";
  return "text-gray-400 dark:text-gray-500";
}

export function ProfessorProfile({ professor }: { professor: Professor }) {
  const { stats } = professor;
  const maxDistribution = Math.max(...stats.distribution, 1);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);

  useEffect(() => {
    getReviewEligibility(professor.id).then(setEligibility);
  }, [professor.id]);

  function handleReviewSuccess() {
    setShowReviewForm(false);
    // Reload page to show updated reviews
    window.location.reload();
  }

  function handleEnrollmentSuccess() {
    setShowEnrollmentForm(false);
    // Re-check eligibility
    getReviewEligibility(professor.id).then(setEligibility);
  }

  return (
    <>
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mb-6"
      >
        <Link
          href="/professors"
          className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          &larr; Back To Professors
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 text-center"
      >
        <Image
          src={getAvatar(professor.name)}
          alt=""
          width={96}
          height={96}
          className="mx-auto mb-4 size-24 rounded-full object-cover"
        />
        <h1 className="font-display text-3xl font-light tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {professor.name}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {professor.university}
          {professor.department && ` — ${professor.department}`}
        </p>
        {professor.bio && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            {professor.bio}
          </p>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease }}
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {/* Overall Rating */}
        <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <p className={`text-4xl font-bold ${ratingTextColor(stats.avgOverall)}`}>
            {stats.avgOverall > 0 ? stats.avgOverall.toFixed(1) : "N/A"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overall Rating
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {stats.reviewCount} review{stats.reviewCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Difficulty */}
        <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.avgDifficulty > 0 ? stats.avgDifficulty.toFixed(1) : "N/A"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Difficulty
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            out of 5
          </p>
        </div>

        {/* Would Take Again */}
        <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.reviewCount > 0 ? `${stats.wouldTakeAgainPct}%` : "N/A"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Would Take Again
          </p>
        </div>
      </motion.div>

      {/* Rating Distribution */}
      {stats.reviewCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="mb-8 rounded-xl border bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
        >
          <h2 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            Rating Distribution
          </h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star - 1];
              const pct = (count / maxDistribution) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-3 shrink-0 text-right text-sm text-gray-500 dark:text-gray-400">
                    {star}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${ratingColor(star)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Rate This Professor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease }}
        className="mb-8"
      >
        {showReviewForm ? (
          <ReviewForm
            professorId={professor.id}
            professorName={professor.name}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowReviewForm(false)}
          />
        ) : showEnrollmentForm ? (
          <EnrollmentForm
            professorId={professor.id}
            professorName={professor.name}
            onSuccess={handleEnrollmentSuccess}
            onCancel={() => setShowEnrollmentForm(false)}
          />
        ) : (
          <ReviewEligibilityBanner
            eligibility={eligibility}
            onRate={() => setShowReviewForm(true)}
            onVerifyEnrollment={() => setShowEnrollmentForm(true)}
          />
        )}
      </motion.div>

      {/* Reviews */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease }}
      >
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          Student Reviews
        </h2>
        {professor.reviews.length === 0 ? (
          <div className="rounded-xl border bg-white/80 p-8 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
            <p className="text-gray-500 dark:text-gray-400">
              No reviews yet. Be the first to rate this professor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {professor.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

function ReviewEligibilityBanner({
  eligibility,
  onRate,
  onVerifyEnrollment,
}: {
  eligibility: Eligibility | null;
  onRate: () => void;
  onVerifyEnrollment: () => void;
}) {
  if (!eligibility) {
    return (
      <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="h-9 w-32 mx-auto animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (eligibility.eligible) {
    return (
      <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Your enrollment is verified. Share your experience.
        </p>
        <Button onClick={onRate}>Rate This Professor</Button>
      </div>
    );
  }

  const messages: Record<string, { text: string; action?: { label: string; onClick?: () => void; href?: string } }> = {
    not_logged_in: {
      text: "Sign in to rate this professor.",
      action: { label: "Sign In", href: "/auth" },
    },
    not_contributor: {
      text: "You need to verify your university email before you can rate professors.",
      action: { label: "Verify Now", href: "/dashboard/contribute" },
    },
    no_enrollment: {
      text: "You need to verify that you took a class with this professor before you can leave a review.",
      action: { label: "Verify Enrollment", onClick: onVerifyEnrollment },
    },
    enrollment_pending: {
      text: "Your enrollment verification is being reviewed. You'll be able to rate once approved.",
    },
    enrollment_rejected: {
      text: `Your enrollment verification was rejected${eligibility.reason === "enrollment_rejected" && "reviewNote" in eligibility ? `: ${eligibility.reviewNote}` : ""}. You can resubmit with correct documentation.`,
      action: { label: "Resubmit Verification", onClick: onVerifyEnrollment },
    },
    already_reviewed: {
      text: "You have already reviewed this professor.",
    },
  };

  const msg = messages[eligibility.reason] || { text: "Unable to rate at this time." };

  return (
    <div className="rounded-xl border bg-white/80 p-5 text-center shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{msg.text}</p>
      {msg.action && (
        msg.action.href ? (
          <Button asChild>
            <Link href={msg.action.href}>{msg.action.label}</Link>
          </Button>
        ) : (
          <Button onClick={msg.action.onClick}>{msg.action.label}</Button>
        )
      )}
    </div>
  );
}
