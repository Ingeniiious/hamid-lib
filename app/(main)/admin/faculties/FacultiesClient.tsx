"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  Trash,
  CaretDown,
  Buildings,
  TreeStructure,
  GraduationCap,
  BookOpen,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/admin/DataTable";
import { StatsCard } from "@/components/admin/StatsCard";
import { DestructiveConfirmDialog } from "@/components/admin/DestructiveConfirmDialog";
import {
  listFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FacultyRow {
  id: number;
  name: string;
  slug: string;
  university: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  programCount: number;
  courseCount: number;
}

interface ProgramRow {
  id: number;
  name: string;
  slug: string;
  facultyId: number;
  displayOrder: number;
  createdAt: string;
}

interface FacultiesClientProps {
  stats: {
    totalFaculties: number;
    totalPrograms: number;
    totalUniversities: number;
    totalCourses: number;
  };
}

// ── Slugify helper ──

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Main Client ──

export function FacultiesClient({ stats }: FacultiesClientProps) {
  // Faculties state
  const [faculties, setFaculties] = useState<FacultyRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Selected faculty for programs panel
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyRow | null>(
    null
  );

  // Faculty dialog state
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRow | null>(null);
  const [facultyForm, setFacultyForm] = useState({
    name: "",
    slug: "",
    university: "",
    description: "",
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "faculty" | "program";
    id: number;
    name: string;
  } | null>(null);

  // ── Load faculties ──

  const loadFaculties = useCallback(
    (currentPage: number, currentSearch: string) => {
      startTransition(async () => {
        const result = await listFaculties({
          search: currentSearch || undefined,
          page: currentPage,
          limit: 20,
        });
        setFaculties(result.faculties as FacultyRow[]);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      });
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadFaculties(page, debouncedSearch);
  }, [page, debouncedSearch, loadFaculties]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // ── Faculty CRUD ──

  const openAddFaculty = () => {
    setEditingFaculty(null);
    setFacultyForm({ name: "", slug: "", university: "", description: "" });
    setFacultyDialogOpen(true);
  };

  const openEditFaculty = (f: FacultyRow) => {
    setEditingFaculty(f);
    setFacultyForm({
      name: f.name,
      slug: f.slug,
      university: f.university,
      description: f.description || "",
    });
    setFacultyDialogOpen(true);
  };

  const handleSaveFaculty = () => {
    if (!facultyForm.name || !facultyForm.slug || !facultyForm.university)
      return;
    startTransition(async () => {
      if (editingFaculty) {
        await updateFaculty(editingFaculty.id, {
          name: facultyForm.name,
          slug: facultyForm.slug,
          university: facultyForm.university,
          description: facultyForm.description || undefined,
        });
      } else {
        await createFaculty({
          name: facultyForm.name,
          slug: facultyForm.slug,
          university: facultyForm.university,
          description: facultyForm.description || undefined,
        });
      }
      setFacultyDialogOpen(false);
      loadFaculties(page, debouncedSearch);
    });
  };

  const confirmDeleteFaculty = (f: FacultyRow) => {
    setDeleteTarget({ type: "faculty", id: f.id, name: f.name });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      if (deleteTarget.type === "faculty") {
        const result = await deleteFaculty(deleteTarget.id);
        if (result.error) return;
        if (selectedFaculty?.id === deleteTarget.id) {
          setSelectedFaculty(null);
        }
      }
      setDeleteTarget(null);
      loadFaculties(page, debouncedSearch);
    });
  };

  // ── Row click → toggle programs panel ──

  const handleRowClick = (f: FacultyRow) => {
    if (selectedFaculty?.id === f.id) {
      setSelectedFaculty(null);
    } else {
      setSelectedFaculty(f);
    }
  };

  // ── Faculty table columns ──

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: FacultyRow) => (
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              rotate: selectedFaculty?.id === item.id ? 180 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            <CaretDown
              size={14}
              weight="duotone"
              className="text-gray-900/30 dark:text-white/30"
            />
          </motion.div>
          <span className="font-medium">{item.name}</span>
        </div>
      ),
    },
    {
      key: "university",
      header: "University",
      render: (item: FacultyRow) => (
        <span className="text-gray-900/70 dark:text-white/70">
          {item.university}
        </span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (item: FacultyRow) => (
        <span className="font-mono text-xs text-gray-900/40 dark:text-white/40">
          {item.slug}
        </span>
      ),
    },
    {
      key: "programCount",
      header: "Programs",
      render: (item: FacultyRow) => (
        <Badge
          variant="outline"
          className="border-gray-900/10 dark:border-white/15"
        >
          {item.programCount}
        </Badge>
      ),
    },
    {
      key: "courseCount",
      header: "Courses",
      render: (item: FacultyRow) => (
        <Badge
          variant="outline"
          className="border-gray-900/10 dark:border-white/15"
        >
          {item.courseCount}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: FacultyRow) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditFaculty(item);
            }}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <PencilSimple size={16} weight="duotone" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              confirmDeleteFaculty(item);
            }}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
          >
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Faculties"
          value={stats.totalFaculties}
          icon={<Buildings size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Total Programs"
          value={stats.totalPrograms}
          icon={<TreeStructure size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Universities"
          value={stats.totalUniversities}
          icon={<GraduationCap size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Courses"
          value={stats.totalCourses}
          icon={<BookOpen size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
            Faculties & Programs
          </h2>
          <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
            {total} {total === 1 ? "faculty" : "faculties"} total
          </p>
        </div>
        <Button
          variant="outline"
          onClick={openAddFaculty}
          className="gap-2 rounded-full border-gray-900/15 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <Plus size={16} weight="duotone" />
          New Faculty
        </Button>
      </motion.div>

      {/* Faculties table */}
      <DataTable<FacultyRow>
        columns={columns}
        data={faculties}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={handleSearch}
        searchPlaceholder="Search by name, university, or slug..."
        onRowClick={handleRowClick}
        loading={isPending && faculties.length === 0}
        emptyMessage="No faculties found."
      />

      {/* Programs panel (shown when a faculty is selected) */}
      <AnimatePresence mode="wait">
        {selectedFaculty && (
          <motion.div
            key={selectedFaculty.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <ProgramsPanel faculty={selectedFaculty} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Faculty add/edit dialog */}
      <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              {editingFaculty ? "Edit Faculty" : "Add Faculty"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                Name
              </Label>
              <Input
                placeholder="Faculty of Engineering"
                value={facultyForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFacultyForm((prev) => ({
                    ...prev,
                    name,
                    slug: editingFaculty ? prev.slug : slugify(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                Slug
              </Label>
              <Input
                placeholder="faculty-of-engineering"
                value={facultyForm.slug}
                onChange={(e) =>
                  setFacultyForm((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                University
              </Label>
              <Input
                placeholder="University Name"
                value={facultyForm.university}
                onChange={(e) =>
                  setFacultyForm((prev) => ({
                    ...prev,
                    university: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                Description (Optional)
              </Label>
              <Input
                placeholder="Brief description..."
                value={facultyForm.description}
                onChange={(e) =>
                  setFacultyForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <Button
              onClick={handleSaveFaculty}
              disabled={
                isPending ||
                !facultyForm.name ||
                !facultyForm.slug ||
                !facultyForm.university
              }
              className="w-full rounded-full"
            >
              {isPending
                ? "Saving..."
                : editingFaculty
                  ? "Update Faculty"
                  : "Create Faculty"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation with OTP */}
      <DestructiveConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "faculty" ? "Faculty" : "Program"}?`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"?${deleteTarget?.type === "faculty" ? " All programs in this faculty will also be deleted." : ""} This action cannot be undone. You will need to verify with a code sent to your email.`}
        onConfirmed={handleDeleteConfirmed}
      />
    </div>
  );
}

// ── Programs Panel ──

function ProgramsPanel({ faculty }: { faculty: FacultyRow }) {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramRow | null>(null);
  const [programForm, setProgramForm] = useState({ name: "", slug: "" });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);

  const loadPrograms = useCallback(
    (currentPage: number, currentSearch: string) => {
      startTransition(async () => {
        const result = await listPrograms({
          facultyId: faculty.id,
          search: currentSearch || undefined,
          page: currentPage,
          limit: 20,
        });
        setPrograms(result.programs as ProgramRow[]);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      });
    },
    [faculty.id]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadPrograms(page, debouncedSearch);
  }, [page, debouncedSearch, loadPrograms]);

  // Reset when faculty changes
  useEffect(() => {
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }, [faculty.id]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openAddProgram = () => {
    setEditingProgram(null);
    setProgramForm({ name: "", slug: "" });
    setDialogOpen(true);
  };

  const openEditProgram = (p: ProgramRow) => {
    setEditingProgram(p);
    setProgramForm({ name: p.name, slug: p.slug });
    setDialogOpen(true);
  };

  const handleSaveProgram = () => {
    if (!programForm.name || !programForm.slug) return;
    startTransition(async () => {
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          name: programForm.name,
          slug: programForm.slug,
        });
      } else {
        await createProgram({
          name: programForm.name,
          slug: programForm.slug,
          facultyId: faculty.id,
        });
      }
      setDialogOpen(false);
      loadPrograms(page, debouncedSearch);
    });
  };

  const handleDeleteProgram = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
      loadPrograms(page, debouncedSearch);
    });
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: ProgramRow) => (
        <span className="font-medium">{item.name}</span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (item: ProgramRow) => (
        <span className="font-mono text-xs text-gray-900/40 dark:text-white/40">
          {item.slug}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: ProgramRow) => (
        <span className="text-sm text-gray-900/50 dark:text-white/50">
          {new Date(item.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: ProgramRow) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditProgram(item);
            }}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <PencilSimple size={16} weight="duotone" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(item);
            }}
            className="rounded-lg p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
          >
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-900/70 dark:text-white/70">
            Programs
          </h3>
          <Badge
            variant="outline"
            className="border-gray-900/10 text-xs dark:border-white/15"
          >
            {faculty.name}
          </Badge>
          <span className="text-xs text-gray-900/40 dark:text-white/40">
            {total} {total === 1 ? "program" : "programs"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openAddProgram}
          className="h-7 gap-1.5 rounded-full border-gray-900/15 bg-white/50 text-xs backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <Plus size={14} weight="duotone" />
          Add Program
        </Button>
      </div>

      {/* Programs table */}
      <DataTable<ProgramRow>
        columns={columns}
        data={programs}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearch={handleSearch}
        searchPlaceholder="Search programs..."
        loading={isPending && programs.length === 0}
        emptyMessage="No programs in this faculty."
      />

      {/* Program add/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              {editingProgram ? "Edit Program" : "Add Program"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                Name
              </Label>
              <Input
                placeholder="Computer Science"
                value={programForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setProgramForm((prev) => ({
                    ...prev,
                    name,
                    slug: editingProgram ? prev.slug : slugify(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-900/70 dark:text-white/70">
                Slug
              </Label>
              <Input
                placeholder="computer-science"
                value={programForm.slug}
                onChange={(e) =>
                  setProgramForm((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={handleSaveProgram}
              disabled={
                isPending || !programForm.name || !programForm.slug
              }
              className="w-full rounded-full"
            >
              {isPending
                ? "Saving..."
                : editingProgram
                  ? "Update Program"
                  : "Create Program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Program delete confirmation with OTP */}
      <DestructiveConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Program?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone. You will need to verify with a code sent to your email.`}
        onConfirmed={handleDeleteProgram}
      />
    </div>
  );
}
