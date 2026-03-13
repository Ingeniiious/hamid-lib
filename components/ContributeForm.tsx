"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
import { CaretUpDown, Check } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  submitTextContribution,
  getCoursesForProgram,
  findOrCreateProgram,
  findOrCreateCourse,
  searchProfessors,
} from "@/app/(main)/dashboard/contribute/actions";
import { useTranslation } from "@/lib/i18n";
import ConfettiBurst from "@/components/ConfettiBurst";
import Link from "next/link";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const inputClass =
  "h-10 rounded-full border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 px-5";

const selectTriggerClass = `${inputClass} w-full justify-center relative [&>svg]:absolute [&>svg]:right-4`;

interface ContributeFormProps {
  programs: { id: number; name: string }[];
  courses: { id: string; title: string }[];
  userProgramId: number | null;
  userFacultyId: number | null;
  initialCourseId?: string;
}

type Mode = "file" | "text";

export function ContributeForm({
  programs,
  courses: initialCourses,
  userProgramId,
  userFacultyId,
  initialCourseId,
}: ContributeFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("file");
  const [programSelection, setProgramSelection] = useState<string>(
    userProgramId ? String(userProgramId) : ""
  );
  const [otherProgramName, setOtherProgramName] = useState("");
  const [courseSelection, setCourseSelection] = useState(initialCourseId || "");
  const [otherCourseName, setOtherCourseName] = useState("");
  const [professorSearch, setProfessorSearch] = useState("");
  const [professorResults, setProfessorResults] = useState<{ id: number; name: string; department: string | null }[]>([]);
  const [selectedProfessor, setSelectedProfessor] = useState<{ id: number; name: string } | null>(null);
  const [professorDropdownOpen, setProfessorDropdownOpen] = useState(false);
  const [searchingProfessors, setSearchingProfessors] = useState(false);
  const [professorHasMore, setProfessorHasMore] = useState(false);
  const [loadingMoreProfessors, setLoadingMoreProfessors] = useState(false);
  const [availableCourses, setAvailableCourses] = useState(initialCourses);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const isOtherProgram = programSelection === "other";
  const isOtherCourse = courseSelection === "other" || isOtherProgram;
  const hasPrograms = programs.length > 0;
  const busy = isPending || uploading;

  // Load initial professors when popover opens
  const professorsFetched = useRef(false);
  useEffect(() => {
    if (!professorDropdownOpen) return;
    if (!professorsFetched.current) {
      professorsFetched.current = true;
      setSearchingProfessors(true);
      searchProfessors("", 0).then(({ items, hasMore }) => {
        setProfessorResults(items);
        setProfessorHasMore(hasMore);
        setSearchingProfessors(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorDropdownOpen]);

  // Debounced professor search
  useEffect(() => {
    const trimmed = professorSearch.trim();
    if (trimmed.length === 0 && professorsFetched.current) {
      // Reset to initial list
      searchProfessors("", 0).then(({ items, hasMore }) => {
        setProfessorResults(items);
        setProfessorHasMore(hasMore);
      });
      return;
    }
    if (trimmed.length === 0) return;
    setSearchingProfessors(true);
    const timeout = setTimeout(() => {
      searchProfessors(trimmed, 0).then(({ items, hasMore }) => {
        setProfessorResults(items);
        setProfessorHasMore(hasMore);
        setSearchingProfessors(false);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [professorSearch]);

  // Load more professors on scroll
  const professorListRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && professorHasMore && !loadingMoreProfessors && !searchingProfessors) {
          setLoadingMoreProfessors(true);
          searchProfessors(professorSearch.trim(), professorResults.length).then(({ items, hasMore }) => {
            setProfessorResults((prev) => [...prev, ...items]);
            setProfessorHasMore(hasMore);
            setLoadingMoreProfessors(false);
          });
        }
      },
      { root: professorListRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [professorHasMore, loadingMoreProfessors, searchingProfessors, professorResults.length, professorSearch]);

  // Fetch courses when program selection changes
  useEffect(() => {
    if (programSelection === "other") {
      setAvailableCourses([]);
      setCourseSelection("other");
      return;
    }

    if (!programSelection) {
      setCourseSelection("");
      return;
    }

    const pid = Number(programSelection);
    if (isNaN(pid)) return;

    // Use initial courses if it's the user's pre-selected program
    if (pid === userProgramId) {
      setAvailableCourses(initialCourses);
      return;
    }

    // Fetch courses for different program
    let cancelled = false;
    setLoadingCourses(true);
    setCourseSelection("");
    getCoursesForProgram(pid)
      .then((courses) => {
        if (!cancelled) setAvailableCourses(courses);
      })
      .finally(() => {
        if (!cancelled) setLoadingCourses(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programSelection]);

  async function resolveCourseId(): Promise<{ courseId: string | null; error?: string }> {
    let resolvedProgramId = !isOtherProgram
      ? Number(programSelection) || null
      : null;
    const facultyId = userFacultyId;

    // Resolve "Other" program
    if (isOtherProgram && otherProgramName.trim() && facultyId) {
      const result = await findOrCreateProgram({
        name: otherProgramName.trim(),
        facultyId,
      });
      if ("error" in result) return { courseId: null, error: result.error };
      resolvedProgramId = result.id;
    }

    // Resolve "Other" course
    if (isOtherCourse && otherCourseName.trim() && resolvedProgramId && facultyId) {
      const result = await findOrCreateCourse({
        name: otherCourseName.trim(),
        programId: resolvedProgramId,
        facultyId,
      });
      if ("error" in result) return { courseId: null, error: result.error };
      return { courseId: result.id };
    }

    // Regular course selection
    if (courseSelection && courseSelection !== "other") {
      return { courseId: courseSelection };
    }

    return { courseId: null };
  }

  function handleTextSubmit() {
    setError("");
    startTransition(async () => {
      try {
        const { courseId, error: resolveError } = await resolveCourseId();
        if (resolveError) {
          setError(resolveError);
          return;
        }
        const result = await submitTextContribution({
          courseId: courseId || "",
          title,
          textContent,
          description,
          professorId: selectedProfessor?.id || null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        resetForm();
      } catch {
        setError(t("common.error"));
      }
    });
  }

  async function handleFileSubmit() {
    if (!file || !title.trim()) {
      setError(t("common.error"));
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { courseId, error: resolveError } = await resolveCourseId();
      if (resolveError) {
        setError(resolveError);
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("courseId", courseId || "");
      if (description) formData.append("description", description.trim());
      if (selectedProfessor?.id) formData.append("professorId", String(selectedProfessor.id));

      const res = await fetch("/api/contribute/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        return;
      }
      resetForm();
    } catch {
      setError(t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setSuccess(true);
    setTitle("");
    setDescription("");
    setTextContent("");
    setFile(null);
    setCourseSelection("");
    setOtherCourseName("");
    setOtherProgramName("");
    setProfessorSearch("");
    setProfessorResults([]);
    setSelectedProfessor(null);
    setProfessorDropdownOpen(false);
  }

  // Trigger confetti 1s after success
  useEffect(() => {
    if (!success) {
      setShowConfetti(false);
      return;
    }
    const timer = setTimeout(() => setShowConfetti(true), 1000);
    return () => clearTimeout(timer);
  }, [success]);

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto flex max-w-sm flex-col items-center justify-center text-center"
      >
        {showConfetti && <ConfettiBurst particleCount={130} startVelocity={20} spread={130} decay={0.95} duration={4} />}
        <img
          src="https://lib.thevibecodedcompany.com/images/submitted-docs.webp"
          alt=""
          className="mb-6 w-48 sm:w-56"
          draggable={false}
        />
        <div className="w-full rounded-3xl border border-gray-900/10 bg-white/50 px-6 py-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <h3 className="font-display text-xl font-light text-gray-900 dark:text-white">
            {t("contribute.contributionSubmitted")}
          </h3>
          <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
            {t("contribute.pendingReview")}
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="flex-1 rounded-full border-gray-900/15 font-medium text-gray-900 hover:bg-gray-900/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              {t("contribute.submitAnother")}
            </Button>
            <Button asChild className="flex-1 rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90">
              <Link href="/dashboard/contribute/my">{t("contribute.myContributions")}</Link>
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
      className="mx-auto max-w-lg text-center"
    >
      <LayoutGroup>
        <motion.div
          layout
          className="overflow-hidden rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-white/10"
          style={{ borderRadius: "1rem" }}
          transition={{ layout: { duration: 0.35, ease } }}
        >
          {/* Mode toggle */}
          <motion.div
            layout
            transition={{ layout: { duration: 0.3, ease } }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-2 rounded-full bg-gray-900/5 p-1 dark:bg-white/5">
              <button
                onClick={() => setMode("file")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "file"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                    : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                }`}
              >
                {t("contribute.fileUpload")}
              </button>
              <button
                onClick={() => setMode("text")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "text"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                    : "text-gray-900/50 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                }`}
              >
                {t("contribute.textNotes")}
              </button>
            </div>
          </motion.div>

          <div className="flex flex-col gap-4">
            {/* Program picker */}
            <AnimatePresence mode="popLayout">
              {hasPrograms && (
                <motion.div
                  key="program-field"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                    {t("contribute.program")}
                  </label>
                  <Select value={programSelection} onValueChange={setProgramSelection}>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder={t("contribute.selectProgram")} />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">{t("contribute.otherManual")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <AnimatePresence mode="popLayout">
                    {isOtherProgram && (
                      <motion.div
                        key="other-program-input"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <Input
                          placeholder={t("contribute.typeProgramName")}
                          value={otherProgramName}
                          onChange={(e) => setOtherProgramName(e.target.value)}
                          disabled={busy}
                          className={`mt-2 ${inputClass}`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Course picker */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.3, ease } }}
            >
              <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                {t("contribute.course")}
              </label>
              {isOtherProgram ? (
                <Input
                  placeholder={t("contribute.typeCourseName")}
                  value={otherCourseName}
                  onChange={(e) => setOtherCourseName(e.target.value)}
                  disabled={busy}
                  className={inputClass}
                />
              ) : (
                <>
                  <Select
                    value={courseSelection}
                    onValueChange={setCourseSelection}
                    disabled={loadingCourses || (hasPrograms && !programSelection)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue
                        placeholder={
                          loadingCourses
                            ? t("contribute.loadingCourses")
                            : hasPrograms && !programSelection
                              ? t("contribute.selectProgramFirst")
                              : t("contribute.selectCourse")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                      {(programSelection || !hasPrograms) && (
                        <SelectItem value="other">{t("contribute.otherManual")}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <AnimatePresence mode="popLayout">
                    {courseSelection === "other" && (
                      <motion.div
                        key="other-course-input"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <Input
                          placeholder={t("contribute.typeCourseName")}
                          value={otherCourseName}
                          onChange={(e) => setOtherCourseName(e.target.value)}
                          disabled={busy}
                          className={`mt-2 ${inputClass}`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>

            {/* Professor picker — search on type */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.3, ease } }}
            >
              <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                {t("contribute.professor")}
              </label>
              <Popover
                open={professorDropdownOpen}
                onOpenChange={(o) => {
                  setProfessorDropdownOpen(o);
                  if (!o) setProfessorSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={professorDropdownOpen}
                    disabled={busy}
                    className={`relative flex h-10 w-full items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 dark:focus-visible:ring-white/30 ${
                      selectedProfessor
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-900/40 dark:text-white/50"
                    }`}
                  >
                    <span>{selectedProfessor ? selectedProfessor.name : t("contribute.selectProfessor")}</span>
                    <CaretUpDown size={16} weight="duotone" className="absolute right-5 text-gray-900/30 dark:text-white/40" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="!w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/90 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-gray-900/95 dark:backdrop-blur-xl"
                  sideOffset={4}
                  collisionPadding={16}
                >
                  <div className="flex h-[260px] flex-col">
                    <div className="shrink-0 px-1 pb-1.5 pt-1">
                      <input
                        type="text"
                        value={professorSearch}
                        onChange={(e) => setProfessorSearch(e.target.value)}
                        placeholder={t("contribute.searchProfessor")}
                        className="w-full rounded-lg border border-gray-900/10 bg-gray-900/5 px-3 py-1.5 text-center text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
                        autoFocus
                      />
                    </div>
                    <div ref={professorListRef} className="min-h-0 flex-1 overflow-y-auto">
                      {/* Selected professor pinned at top with deselect */}
                      {selectedProfessor && !professorSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfessor(null);
                          }}
                          className="relative flex w-full items-center justify-center rounded-lg bg-gray-900/5 px-3 py-2 text-sm text-gray-900 dark:bg-white/10 dark:text-white"
                        >
                          <Check size={14} className="absolute left-3 text-gray-900 dark:text-white" />
                          {selectedProfessor.name}
                          <span className="absolute right-3 text-xs text-gray-900/40 dark:text-white/40">&times;</span>
                        </button>
                      )}
                      {/* Professor list (skip selected to avoid duplicate) */}
                      {professorResults
                        .filter((p) => p.id !== selectedProfessor?.id)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProfessor({ id: p.id, name: p.name });
                              setProfessorSearch("");
                              setProfessorDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/80 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            {p.name}
                            {p.department && (
                              <span className="ml-1 text-gray-900/40 dark:text-white/40"> — {p.department}</span>
                            )}
                          </button>
                        ))}
                      {/* Infinite scroll sentinel */}
                      {professorHasMore && (
                        <div ref={sentinelRef} className="py-2 text-center text-xs text-gray-900/30 dark:text-white/30">
                          {loadingMoreProfessors ? t("contribute.loadingCourses") : ""}
                        </div>
                      )}
                      {searchingProfessors && professorResults.length === 0 && (
                        <p className="py-3 text-center text-sm text-gray-900/40 dark:text-white/40">
                          {t("contribute.loadingCourses")}
                        </p>
                      )}
                      {!searchingProfessors && professorResults.length === 0 && (
                        <p className="py-3 text-center text-sm text-gray-900/40 dark:text-white/40">
                          {t("contribute.noResults")}
                        </p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Title */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.3, ease } }}
            >
              <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                {t("contribute.titleLabel")}
              </label>
              <Input
                placeholder={t("contribute.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                className={inputClass}
              />
            </motion.div>

            {/* Description */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.3, ease } }}
            >
              <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                {t("contribute.descriptionLabel")}
              </label>
              <Input
                placeholder={t("contribute.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                className={inputClass}
              />
            </motion.div>

            {/* File upload / Text content */}
            <AnimatePresence mode="popLayout">
              {mode === "file" ? (
                <motion.div
                  key="file-field"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                    {t("contribute.fileLabel")}
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
                          {t("contribute.clickToUpload")}
                        </p>
                        <p className="mt-1 text-xs text-gray-900/30 dark:text-white/30">
                          {t("contribute.fileTypes")}
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
                </motion.div>
              ) : (
                <motion.div
                  key="text-field"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <label className="mb-1.5 block text-center text-sm font-medium text-gray-900/70 dark:text-white/70">
                    {t("contribute.contentLabel")}
                  </label>
                  <Textarea
                    placeholder={t("contribute.textPlaceholder")}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={8}
                    disabled={busy}
                    className="rounded-2xl border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 px-5"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease }}
                  className="text-sm text-red-500 dark:text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.3, ease } }}
            >
              <Button
                onClick={mode === "file" ? handleFileSubmit : handleTextSubmit}
                disabled={
                  busy ||
                  !title.trim() ||
                  (mode === "file" && !file) ||
                  (mode === "text" && !textContent.trim())
                }
                className="w-full rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? t("contribute.submitting") : t("contribute.submitContribution")}
              </Button>
            </motion.div>
          </div>

          {/* Links */}
          <motion.div
            layout
            transition={{ layout: { duration: 0.3, ease } }}
            className="mt-6 flex items-center justify-center text-xs"
          >
            <Link
              href="/dashboard/contribute/my"
              className="text-gray-900/40 underline hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60"
            >
              {t("contribute.myContributions")}
            </Link>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </motion.div>
  );
}
