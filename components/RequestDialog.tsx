"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitFacultyRequest,
  submitCourseRequest,
} from "@/app/(main)/dashboard/contribute/request-actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface RequestDialogProps {
  open: boolean;
  onClose: () => void;
  faculties?: { id: number; name: string }[];
}

type Mode = "faculty" | "course";

export function RequestDialog({ open, onClose, faculties = [] }: RequestDialogProps) {
  const [mode, setMode] = useState<Mode>("course");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Faculty request
  const [facultyName, setFacultyName] = useState("");

  // Course request
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseProfessor, setCourseProfessor] = useState("");
  const [courseSemester, setCourseSemester] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess(false);
      setFacultyName("");
      setCourseName("");
      setCourseProfessor("");
      setCourseSemester("");
      setSelectedFacultyId("");
    }
  }, [open]);

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      if (mode === "faculty") {
        const result = await submitFacultyRequest({ facultyName });
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        if (!selectedFacultyId) {
          setError("Please select a faculty.");
          return;
        }
        const result = await submitCourseRequest({
          existingFacultyId: parseInt(selectedFacultyId),
          courseName,
          courseProfessor: courseProfessor || undefined,
          courseSemester: courseSemester || undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setSuccess(true);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease }}
        className="relative w-full max-w-md rounded-2xl border border-gray-900/10 bg-white p-6 shadow-xl dark:border-white/15 dark:bg-gray-950"
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <svg
                  className="h-6 w-6 text-green-500"
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
              <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
                Request Submitted
              </h3>
              <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
                We&apos;ll review your request and add it if everything checks
                out.
              </p>
              <Button onClick={onClose} className="mt-4 w-full">
                Close
              </Button>
            </motion.div>
          ) : (
            <motion.div key="form">
              <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
                Can&apos;t Find What You Need?
              </h3>
              <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
                Request a missing faculty or course.
              </p>

              {/* Mode toggle */}
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-900/5 p-1 dark:bg-white/5">
                <button
                  onClick={() => setMode("course")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === "course"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                      : "text-gray-900/50 dark:text-white/50"
                  }`}
                >
                  Course
                </button>
                <button
                  onClick={() => setMode("faculty")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === "faculty"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                      : "text-gray-900/50 dark:text-white/50"
                  }`}
                >
                  Faculty
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {mode === "faculty" ? (
                  <Input
                    placeholder="Faculty Name"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    disabled={isPending}
                  />
                ) : (
                  <>
                    <Select
                      value={selectedFacultyId}
                      onValueChange={setSelectedFacultyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {faculties.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Course Name"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      disabled={isPending}
                    />
                    <Input
                      placeholder="Professor (Optional)"
                      value={courseProfessor}
                      onChange={(e) => setCourseProfessor(e.target.value)}
                      disabled={isPending}
                    />
                    <Input
                      placeholder="Semester (Optional)"
                      value={courseSemester}
                      onChange={(e) => setCourseSemester(e.target.value)}
                      disabled={isPending}
                    />
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1"
                    disabled={
                      isPending ||
                      (mode === "faculty" && !facultyName.trim()) ||
                      (mode === "course" &&
                        (!selectedFacultyId || !courseName.trim()))
                    }
                  >
                    {isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
