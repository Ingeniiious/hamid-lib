"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";

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
  const { locale, t } = useTranslation();
  const titleDir = locale === "fa" ? "rtl" : undefined;
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
      setError(t("professors.fileTooLarge"));
      return;
    }
    setFile(selected);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!courseName.trim()) return setError(t("professors.courseNameError"));
    if (!semester.trim()) return setError(t("professors.semesterError"));
    if (!file) return setError(t("professors.uploadProofError"));

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
        setError(data.error || t("professors.submissionFailed"));
      } else {
        onSuccess();
      }
    } catch {
      setError(t("professors.networkError"));
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
      <h3 dir={titleDir} className="mb-1 text-lg font-medium text-gray-900 dark:text-white">
        {t("professors.verifyEnrollmentTitle")}
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t("professors.verifyEnrollmentDescription").replace("{name}", professorName)}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("professors.courseNameRequired")}
          </label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder={t("professors.courseNamePlaceholder")}
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("professors.semester")}
          </label>
          <Input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder={t("professors.semesterPlaceholder")}
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("professors.proofOfEnrollment")}
          </label>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
            {t("professors.proofDescription")}
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
            {submitting ? t("professors.submitting") : t("professors.submitVerification")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t("professors.proofReviewNote")}
        </p>
      </form>
    </motion.div>
  );
}
