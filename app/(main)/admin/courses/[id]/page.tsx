"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trash, File } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCourse, updateCourse, deleteCourse, getAllFaculties } from "../actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Material {
  id: string;
  title: string;
  type: string;
  order: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CourseData {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  major: string | null;
  semester: string | null;
  professor: string | null;
  facultyId: number | null;
  facultyName: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  materials: Material[];
}

interface Faculty {
  id: number;
  name: string;
  slug: string;
  university: string;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [semester, setSemester] = useState("");
  const [professor, setProfessor] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const [data, facultyData] = await Promise.all([
        getCourse(id),
        getAllFaculties(),
      ]);

      setFaculties(facultyData);

      if (data) {
        setCourseData(data);
        setTitle(data.title);
        setSlug(data.slug || "");
        setDescription(data.description || "");
        setFacultyId(data.facultyId ? String(data.facultyId) : "");
        setSemester(data.semester || "");
        setProfessor(data.professor || "");
      }

      setLoading(false);
    });
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      await updateCourse(id, {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        facultyId: facultyId ? Number(facultyId) : null,
        semester: semester.trim() || undefined,
        professor: professor.trim() || undefined,
      });

      // Refresh data
      const data = await getCourse(id);
      if (data) setCourseData(data);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteCourse(id);
      router.push("/admin/courses");
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 sm:p-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-900/50 dark:text-white/50">
          Course not found.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/courses")}
          className="mt-4 rounded-full border-gray-900/10 dark:border-white/15"
        >
          Back To Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/courses")}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft size={20} weight="duotone" />
          </button>
          <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
            {courseData.title}
          </h2>
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 rounded-full border-red-500/20 text-red-600 hover:bg-red-500/10 dark:border-red-400/20 dark:text-red-400"
            >
              <Trash size={16} weight="duotone" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
            <DialogHeader>
              <DialogTitle className="font-display font-light">
                Delete Course
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-900/70 dark:text-white/70">
                Are you sure you want to delete{" "}
                <strong>{courseData.title}</strong>? This will also delete all
                associated materials. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="rounded-full border-gray-900/10 dark:border-white/15"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="rounded-full"
                >
                  {isPending ? "Deleting..." : "Delete Course"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
      >
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="materials">
              Materials ({courseData.materials.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form
              onSubmit={handleSave}
              className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 sm:p-8"
            >
              <div className="space-y-2">
                <Label className="text-gray-900/70 dark:text-white/70">
                  Title
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title"
                  required
                  className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900/70 dark:text-white/70">
                  Slug
                </Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="course-slug"
                  className="rounded-xl border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                />
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

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-900/30 dark:text-white/30">
                  Created{" "}
                  {new Date(courseData.createdAt).toLocaleDateString()} | Updated{" "}
                  {new Date(courseData.updatedAt).toLocaleDateString()}
                </p>
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="rounded-full"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="materials">
            <div className="mx-auto max-w-2xl space-y-3">
              {courseData.materials.length === 0 ? (
                <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                  <p className="text-sm text-gray-900/40 dark:text-white/40">
                    No materials yet.
                  </p>
                </div>
              ) : (
                courseData.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900/5 dark:bg-white/10">
                        <File
                          size={18}
                          weight="duotone"
                          className="text-gray-900/50 dark:text-white/50"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {mat.title}
                        </p>
                        <p className="text-xs text-gray-900/40 dark:text-white/40">
                          {mat.type} | Order: {mat.order ?? 0}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-gray-900/10 bg-gray-900/5 text-xs dark:border-white/15 dark:bg-white/10"
                    >
                      {mat.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
