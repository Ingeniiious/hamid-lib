"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitTextContribution } from "@/app/(main)/dashboard/contribute/actions";
import Link from "next/link";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface ContributeFormProps {
  courses: { id: string; title: string }[];
}

type Mode = "file" | "text";

export function ContributeForm({ courses }: ContributeFormProps) {
  const [mode, setMode] = useState<Mode>("file");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleTextSubmit() {
    setError("");
    startTransition(async () => {
      const result = await submitTextContribution({
        courseId,
        title,
        textContent,
        description,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTitle("");
      setDescription("");
      setTextContent("");
      setCourseId("");
    });
  }

  async function handleFileSubmit() {
    if (!file || !title.trim()) {
      setError("Title and file are required.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("courseId", courseId);
      if (description) formData.append("description", description.trim());

      const res = await fetch("/api/contribute/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      setSuccess(true);
      setTitle("");
      setDescription("");
      setFile(null);
      setCourseId("");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto max-w-md text-center"
      >
        <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl font-light text-gray-900 dark:text-white">
            Contribution Submitted!
          </h3>
          <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
            Your contribution is pending review. You&apos;ll be notified once
            it&apos;s approved.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="flex-1"
            >
              Submit Another
            </Button>
            <Button asChild className="flex-1">
              <Link href="/dashboard/contribute/my">My Contributions</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="mx-auto max-w-lg"
    >
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-white/10">
        {/* Mode toggle */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-gray-900/5 p-1 dark:bg-white/5">
          <button
            onClick={() => setMode("file")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === "file"
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setMode("text")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === "text"
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
            }`}
          >
            Text Notes
          </button>
        </div>

        <div className="space-y-4">
          {/* Course picker */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900/70 dark:text-white/70">
              Course (Optional)
            </label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select A Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900/70 dark:text-white/70">
              Title
            </label>
            <Input
              placeholder="e.g. Midterm Notes Chapter 3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending || uploading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900/70 dark:text-white/70">
              Description (Optional)
            </label>
            <Input
              placeholder="Brief context about this contribution"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending || uploading}
            />
          </div>

          {/* File upload */}
          {mode === "file" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900/70 dark:text-white/70">
                File
              </label>
              <div
                className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-900/10 bg-gray-900/[0.02] p-6 transition-colors hover:border-gray-900/20 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                onClick={() =>
                  document.getElementById("contribution-file")?.click()
                }
              >
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-900/50 dark:text-white/50">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-900/50 dark:text-white/50">
                      Click To Upload Or Drag And Drop
                    </p>
                    <p className="mt-1 text-xs text-gray-900/30 dark:text-white/30">
                      PDF, Images, Office Docs, TXT (Max 50MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                id="contribution-file"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {/* Text content */}
          {mode === "text" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900/70 dark:text-white/70">
                Content
              </label>
              <Textarea
                placeholder="Paste or type your notes, summaries, explanations..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                disabled={isPending}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={mode === "file" ? handleFileSubmit : handleTextSubmit}
            disabled={
              isPending ||
              uploading ||
              !title.trim() ||
              (mode === "file" && !file) ||
              (mode === "text" && !textContent.trim())
            }
            className="w-full"
          >
            {isPending || uploading ? "Submitting..." : "Submit Contribution"}
          </Button>
        </div>

        {/* Links */}
        <div className="mt-6 flex items-center justify-between text-xs">
          <Link
            href="/dashboard/contribute/my"
            className="text-gray-900/40 underline hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60"
          >
            My Contributions
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
