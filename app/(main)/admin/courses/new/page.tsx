"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCourse, getAllFaculties } from "../actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Faculty {
  id: number;
  name: string;
  slug: string;
  university: string;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewCoursePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [semester, setSemester] = useState("");
  const [professor, setProfessor] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await getAllFaculties();
      setFaculties(data);
    });
  }, []);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(toSlug(title));
    }
  }, [title, slugManuallyEdited]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    startTransition(async () => {
      const result = await createCourse({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        facultyId: facultyId ? Number(facultyId) : undefined,
        semester: semester.trim() || undefined,
        professor: professor.trim() || undefined,
      });

      if (result.success) {
        router.push("/admin/courses");
      }
    });
  };

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.push("/admin/courses")}
          className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <ArrowLeft size={20} weight="duotone" />
        </button>
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          New Course
        </h2>
      </motion.div>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 sm:p-8"
      >
        <div className="space-y-2">
          <Label className="text-gray-900/70 dark:text-white/70">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
            required
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900/70 dark:text-white/70">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            placeholder="course-slug"
            required
            className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          />
          <p className="text-xs text-gray-900/40 dark:text-white/40">
            Auto-generated from title. Edit manually if needed.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900/70 dark:text-white/70">
            Description
          </Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Course description (optional)"
            rows={3}
            className="w-full rounded-xl border border-gray-900/10 bg-white/50 px-3 py-2 text-sm text-gray-900 backdrop-blur-xl placeholder:text-gray-900/40 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900/70 dark:text-white/70">
            Faculty
          </Label>
          <Select value={facultyId} onValueChange={setFacultyId}>
            <SelectTrigger className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <SelectValue placeholder="Select faculty (optional)" />
            </SelectTrigger>
            <SelectContent>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name} — {f.university}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-gray-900/70 dark:text-white/70">
              Semester
            </Label>
            <Input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. Fall 2026"
              className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900/70 dark:text-white/70">
              Professor
            </Label>
            <Input
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              placeholder="Professor name"
              className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/courses")}
            className="rounded-full border-gray-900/10 bg-transparent dark:border-white/15"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !title.trim() || !slug.trim()}
            className="rounded-full"
          >
            {isPending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
