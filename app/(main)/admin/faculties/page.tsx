"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
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
import {
  listFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  reorderFaculties,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Faculty {
  id: number;
  name: string;
  slug: string;
  university: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
}

interface Program {
  id: number;
  name: string;
  slug: string;
  facultyId: number;
  displayOrder: number;
  createdAt: string;
}

export default function FacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Form state
  const [facultyForm, setFacultyForm] = useState({
    name: "",
    slug: "",
    university: "",
    description: "",
  });
  const [programForm, setProgramForm] = useState({ name: "", slug: "" });

  useEffect(() => {
    loadFaculties();
  }, []);

  const loadFaculties = () => {
    startTransition(async () => {
      const data = await listFaculties();
      setFaculties(data);
    });
  };

  const loadPrograms = (facultyId: number) => {
    startTransition(async () => {
      const data = await listPrograms(facultyId);
      setPrograms(data);
    });
  };

  const handleSelectFaculty = (f: Faculty) => {
    setSelectedFaculty(f);
    loadPrograms(f.id);
  };

  // Faculty CRUD
  const openAddFaculty = () => {
    setEditingFaculty(null);
    setFacultyForm({ name: "", slug: "", university: "", description: "" });
    setFacultyDialogOpen(true);
  };

  const openEditFaculty = (f: Faculty) => {
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
      loadFaculties();
      if (selectedFaculty && editingFaculty?.id === selectedFaculty.id) {
        setSelectedFaculty({
          ...selectedFaculty,
          name: facultyForm.name,
          slug: facultyForm.slug,
          university: facultyForm.university,
          description: facultyForm.description || null,
        });
      }
    });
  };

  const handleDeleteFaculty = (id: number) => {
    startTransition(async () => {
      const result = await deleteFaculty(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (selectedFaculty?.id === id) {
        setSelectedFaculty(null);
        setPrograms([]);
      }
      loadFaculties();
    });
  };

  // Program CRUD
  const openAddProgram = () => {
    setEditingProgram(null);
    setProgramForm({ name: "", slug: "" });
    setProgramDialogOpen(true);
  };

  const openEditProgram = (p: Program) => {
    setEditingProgram(p);
    setProgramForm({ name: p.name, slug: p.slug });
    setProgramDialogOpen(true);
  };

  const handleSaveProgram = () => {
    if (!programForm.name || !programForm.slug || !selectedFaculty) return;
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
          facultyId: selectedFaculty.id,
        });
      }
      setProgramDialogOpen(false);
      loadPrograms(selectedFaculty.id);
    });
  };

  const handleDeleteProgram = (id: number) => {
    if (!selectedFaculty) return;
    startTransition(async () => {
      await deleteProgram(id);
      loadPrograms(selectedFaculty.id);
    });
  };

  // Auto-generate slug from name
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between"
      >
        <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Faculties & Programs
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="flex flex-col gap-6 lg:flex-row"
      >
        {/* Left panel: Faculty list */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900/70 dark:text-white/70">
                Faculties
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={openAddFaculty}
                className="h-7 gap-1.5 rounded-full border-gray-900/15 bg-white/50 text-xs backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
              >
                <Plus size={14} weight="duotone" />
                Add
              </Button>
            </div>

            <div className="space-y-1.5">
              {faculties.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleSelectFaculty(f)}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                    selectedFaculty?.id === f.id
                      ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                      : "text-gray-900/70 hover:bg-gray-900/5 dark:text-white/70 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="truncate text-xs opacity-50">{f.university}</p>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditFaculty(f);
                      }}
                      className="rounded-md p-1 text-gray-900/40 hover:bg-gray-900/10 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <PencilSimple size={14} weight="duotone" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFaculty(f.id);
                      }}
                      className="rounded-md p-1 text-gray-900/40 hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                    >
                      <Trash size={14} weight="duotone" />
                    </button>
                  </div>
                </div>
              ))}

              {faculties.length === 0 && !isPending && (
                <p className="py-6 text-center text-sm text-gray-900/40 dark:text-white/40">
                  No faculties yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Programs for selected faculty */}
        <div className="flex-1">
          {selectedFaculty ? (
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-900/70 dark:text-white/70">
                    Programs
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-gray-900/10 text-xs dark:border-white/15"
                  >
                    {selectedFaculty.name}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddProgram}
                  className="h-7 gap-1.5 rounded-full border-gray-900/15 bg-white/50 text-xs backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                >
                  <Plus size={14} weight="duotone" />
                  Add
                </Button>
              </div>

              <div className="space-y-1.5">
                {programs.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-gray-900/70 transition-colors hover:bg-gray-900/5 dark:text-white/70 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs opacity-50">{p.slug}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEditProgram(p)}
                        className="rounded-md p-1 text-gray-900/40 hover:bg-gray-900/10 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <PencilSimple size={14} weight="duotone" />
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(p.id)}
                        className="rounded-md p-1 text-gray-900/40 hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                      >
                        <Trash size={14} weight="duotone" />
                      </button>
                    </div>
                  </div>
                ))}

                {programs.length === 0 && !isPending && (
                  <p className="py-6 text-center text-sm text-gray-900/40 dark:text-white/40">
                    No programs in this faculty.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-900/10 dark:border-white/15">
              <p className="text-sm text-gray-900/40 dark:text-white/40">
                Select a faculty to manage its programs.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Faculty Dialog */}
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

      {/* Program Dialog */}
      <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
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
    </div>
  );
}
