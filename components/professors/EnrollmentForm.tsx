"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function EnrollmentForm({
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
  const [courseName, setCourseName] = useState("");
  const [semester, setSemester] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setError("File too large. Max 10MB.");
      return;
    }
    setFile(selected);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!courseName.trim()) return setError("Course name is required.");
    if (!semester.trim()) return setError("Semester is required.");
    if (!file) return setError("Please upload proof of enrollment (transcript, schedule, etc.).");

    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("professorId", String(professorId));
    formData.append("courseName", courseName.trim());
    formData.append("semester", semester.trim());

    try {
      const res = await fetch("/api/professors/enrollment", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Submission failed. Please try again.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
    >
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">
        Verify Enrollment
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Prove you took a class with {professorName} to leave a review. Upload your transcript, class schedule, or enrollment confirmation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Course Name
          </label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Introduction to Psychology"
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Semester
          </label>
          <Input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="e.g. Spring 2026"
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Proof Of Enrollment
          </label>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
            Upload a screenshot or PDF of your transcript, class schedule, or enrollment confirmation showing the professor&apos;s name and the course. Max 10MB. Accepted: PDF, PNG, JPG, WebP.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 dark:text-gray-400"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Verification"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Your proof will be reviewed by a moderator. You&apos;ll be able to rate the professor once approved.
        </p>
      </form>
    </motion.div>
  );
}
