"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitReview, REVIEW_TAGS } from "@/app/(public)/professors/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function ReviewForm({
  professorId,
  professorName,
  onSuccess,
  onCancel,
}: {
  professorId: number;
  professorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [overallRating, setOverallRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(0);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [courseName, setCourseName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (overallRating === 0) return setError("Please select an overall rating.");
    if (difficultyRating === 0) return setError("Please select a difficulty rating.");
    if (wouldTakeAgain === null) return setError("Please select if you would take this professor again.");

    setSubmitting(true);
    const result = await submitReview({
      professorId,
      overallRating,
      difficultyRating,
      wouldTakeAgain,
      reviewText: reviewText.trim() || undefined,
      courseName: courseName.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
    >
      <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
        Rate {professorName}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Course Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Course Name (optional)
          </label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Introduction to Psychology"
            maxLength={200}
          />
        </div>

        {/* Overall Rating */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Rating
          </label>
          <RatingPicker value={overallRating} onChange={setOverallRating} />
        </div>

        {/* Difficulty Rating */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Difficulty
          </label>
          <RatingPicker value={difficultyRating} onChange={setDifficultyRating} />
        </div>

        {/* Would Take Again */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Would You Take This Professor Again?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldTakeAgain(true)}
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                wouldTakeAgain === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldTakeAgain(false)}
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                wouldTakeAgain === false
                  ? "border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags (select up to 5)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Review (optional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this professor..."
            maxLength={2000}
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {reviewText.length}/2000
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Your review will be visible after moderation.
        </p>
      </form>
    </motion.div>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
            n <= value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
