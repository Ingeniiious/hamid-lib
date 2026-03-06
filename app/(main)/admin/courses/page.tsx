"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import { listCourses } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CourseRow {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  semester: string | null;
  professor: string | null;
  facultyId: number | null;
  facultyName: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadCourses = useCallback(
    (currentPage: number, currentSearch: string) => {
      startTransition(async () => {
        const result = await listCourses({
          search: currentSearch || undefined,
          page: currentPage,
          limit: 20,
        });
        setCourses(result.courses as CourseRow[]);
        setTotalPages(result.totalPages);
      });
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadCourses(page, debouncedSearch);
  }, [page, debouncedSearch, loadCourses]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (item: CourseRow) => (
        <span className="font-medium">{item.title}</span>
      ),
    },
    {
      key: "facultyName",
      header: "Faculty",
      render: (item: CourseRow) =>
        item.facultyName ? (
          <Badge
            variant="outline"
            className="border-gray-900/10 bg-gray-900/5 dark:border-white/15 dark:bg-white/10"
          >
            {item.facultyName}
          </Badge>
        ) : (
          <span className="text-gray-900/30 dark:text-white/30">--</span>
        ),
    },
    {
      key: "professor",
      header: "Professor",
      render: (item: CourseRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.professor || "--"}
        </span>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      render: (item: CourseRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.semester || "--"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: CourseRow) => (
        <span className="text-sm text-gray-900/50 dark:text-white/50">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Courses
        </h2>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/courses/new")}
          className="gap-2 rounded-full border-gray-900/15 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <Plus size={16} weight="duotone" />
          New Course
        </Button>
      </motion.div>

      <DataTable<CourseRow>
        columns={columns}
        data={courses}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={handleSearch}
        searchPlaceholder="Search by title or professor..."
        onRowClick={(item) => router.push(`/admin/courses/${item.id}`)}
        loading={isPending}
        emptyMessage="No courses found."
      />
    </div>
  );
}
