"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  Trash,
  Lightning,
  Article,
  Files,
  CheckCircle,
  Stack,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/admin/StatsCard";
import { DestructiveConfirmDialog } from "@/components/admin/DestructiveConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  activatePromptTemplate,
  deletePromptTemplate,
} from "./actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video_script: "Video Script",
  podcast_script: "Podcast Script",
  study_guide: "Study Guide",
  flashcards: "Flashcards",
  quiz: "Quiz",
  mock_exam: "Mock Exam",
  mind_map: "Mind Map",
  infographic_data: "Infographic",
  slide_deck: "Slide Deck",
  data_table: "Data Table",
  report: "Report",
  interactive_section: "Interactive Section",
};

const ALL_CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptStats {
  totalTemplates: number;
  activeTemplates: number;
  contentTypesWithTemplates: number;
}

interface TemplateRow {
  id: number;
  contentType: string;
  name: string;
  description: string | null;
  structurePrompt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  contentType: string;
  name: string;
  description: string;
  structurePrompt: string;
}

const EMPTY_FORM: FormData = {
  contentType: "",
  name: "",
  description: "",
  structurePrompt: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptsClient({ stats }: { stats: PromptStats }) {
  // Data state
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);

  // Transition for server actions
  const [isPending, startTransition] = useTransition();

  // ── Fetch templates ──
  const fetchTemplates = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      const result = await listPromptTemplates({
        contentType: activeFilter === "all" ? undefined : activeFilter,
        limit: 100,
      });
      setTemplates(result.templates);
      setLoading(false);
    });
  }, [activeFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Create / Edit dialog ──
  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((t: TemplateRow) => {
    setEditingId(t.id);
    setForm({
      contentType: t.contentType,
      name: t.name,
      description: t.description || "",
      structurePrompt: t.structurePrompt,
    });
    setFormError("");
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.structurePrompt.trim()) {
      setFormError("Structure prompt is required.");
      return;
    }
    if (!editingId && !form.contentType) {
      setFormError("Content type is required.");
      return;
    }

    setFormError("");
    startTransition(async () => {
      let result: { success?: boolean; error?: string };

      if (editingId) {
        result = await updatePromptTemplate(editingId, {
          name: form.name,
          description: form.description || undefined,
          structurePrompt: form.structurePrompt,
        });
      } else {
        result = await createPromptTemplate({
          contentType: form.contentType,
          name: form.name,
          description: form.description || undefined,
          structurePrompt: form.structurePrompt,
        });
      }

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setDialogOpen(false);
      fetchTemplates();
    });
  }, [editingId, form, fetchTemplates]);

  // ── Activate ──
  const handleActivate = useCallback(
    (id: number) => {
      startTransition(async () => {
        const result = await activatePromptTemplate(id);
        if (result.error) return;
        fetchTemplates();
      });
    },
    [fetchTemplates]
  );

  // ── Delete ──
  const handleDeleteConfirmed = useCallback(() => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePromptTemplate(deleteTarget.id);
      if (result.error) return;
      setDeleteTarget(null);
      fetchTemplates();
    });
  }, [deleteTarget, fetchTemplates]);

  // ── Render ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-display font-light text-gray-900 dark:text-white">
          Prompt Templates
        </h1>
        <p className="mt-2 text-sm text-gray-900/60 dark:text-white/60">
          Manage Storytelling Structure Prompts For Each Content Type
        </p>
      </motion.div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Templates"
          value={stats.totalTemplates}
          icon={<Files size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Active Templates"
          value={stats.activeTemplates}
          icon={<CheckCircle size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Content Types"
          value={stats.contentTypesWithTemplates}
          icon={<Stack size={24} weight="duotone" />}
          index={2}
        />
      </div>

      {/* Filter Pills + Create Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.3 }}
        className="mb-6 flex flex-col items-center gap-4"
      >
        {/* Filter pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeFilter === "all"
                ? "bg-[#5227FF] text-white"
                : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
            }`}
          >
            All
          </button>
          {ALL_CONTENT_TYPES.map((ct) => (
            <button
              key={ct}
              onClick={() => setActiveFilter(ct)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeFilter === ct
                  ? "bg-[#5227FF] text-white"
                  : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
              }`}
            >
              {CONTENT_TYPE_LABELS[ct]}
            </button>
          ))}
        </div>

        {/* Create button */}
        <Button
          onClick={openCreate}
          className="rounded-full bg-[#5227FF] text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={18} weight="bold" className="mr-1.5" />
          Create Template
        </Button>
      </motion.div>

      {/* Templates Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
              >
                <Skeleton className="mx-auto mb-3 h-5 w-3/4 rounded-full" />
                <Skeleton className="mx-auto mb-4 h-4 w-1/2 rounded-full" />
                <Skeleton className="mx-auto mb-2 h-3 w-full rounded-full" />
                <Skeleton className="mx-auto mb-4 h-3 w-2/3 rounded-full" />
                <Skeleton className="mx-auto mb-4 h-16 w-full rounded-xl" />
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-8 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : templates.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <EmptyState
              title="No Templates Found"
              description={
                activeFilter === "all"
                  ? "Create your first prompt template to get started."
                  : `No templates for ${CONTENT_TYPE_LABELS[activeFilter] || activeFilter}.`
              }
              icon={<Article size={40} weight="duotone" />}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${activeFilter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {templates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="relative flex flex-col rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
              >
                {/* Name */}
                <h3 className="text-center text-lg font-display font-light text-gray-900 dark:text-white">
                  {t.name}
                </h3>

                {/* Badges */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full text-xs"
                  >
                    {CONTENT_TYPE_LABELS[t.contentType] || t.contentType}
                  </Badge>
                  {t.isActive ? (
                    <Badge className="rounded-full bg-emerald-500/15 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full text-xs text-gray-900/40 dark:text-white/40"
                    >
                      Inactive
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {t.description && (
                  <p className="mt-3 line-clamp-2 text-center text-sm text-gray-900/60 dark:text-white/60">
                    {t.description}
                  </p>
                )}

                {/* Structure Prompt Preview */}
                <div className="mt-3 flex-1 rounded-xl bg-gray-900/5 p-3 dark:bg-white/5">
                  <p className="line-clamp-3 text-center text-xs font-mono text-gray-900/50 dark:text-white/50">
                    {t.structurePrompt.length > 100
                      ? t.structurePrompt.slice(0, 100) + "..."
                      : t.structurePrompt}
                  </p>
                </div>

                {/* Updated At */}
                <p className="mt-3 text-center text-xs text-gray-900/30 dark:text-white/30">
                  Updated{" "}
                  {new Date(t.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(t)}
                    className="rounded-full"
                    disabled={isPending}
                  >
                    <PencilSimple size={14} weight="duotone" className="mr-1" />
                    Edit
                  </Button>

                  {!t.isActive && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleActivate(t.id)}
                        className="rounded-full bg-[#5227FF] text-white hover:opacity-90 disabled:opacity-50"
                        disabled={isPending}
                      >
                        <Lightning size={14} weight="duotone" className="mr-1" />
                        Activate
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(t)}
                        className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        disabled={isPending}
                      >
                        <Trash size={14} weight="duotone" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-gray-900/15 bg-white/95 backdrop-blur-xl sm:max-w-2xl dark:border-white/15 dark:bg-gray-900/95">
          <DialogHeader>
            <DialogTitle className="text-center font-display font-light">
              {editingId ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col items-center gap-5">
            {/* Content Type (create only) */}
            {!editingId && (
              <div className="flex w-full flex-col items-center gap-1.5">
                <Label className="text-center text-sm text-gray-900/60 dark:text-white/60">
                  Content Type
                </Label>
                <Select
                  value={form.contentType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, contentType: v }))
                  }
                >
                  <SelectTrigger className="w-full max-w-sm rounded-full text-center">
                    <SelectValue placeholder="Select Content Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {CONTENT_TYPE_LABELS[ct]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Content Type display (edit only) */}
            {editingId && (
              <div className="flex w-full flex-col items-center gap-1.5">
                <Label className="text-center text-sm text-gray-900/60 dark:text-white/60">
                  Content Type
                </Label>
                <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-sm">
                  {CONTENT_TYPE_LABELS[form.contentType] || form.contentType}
                </Badge>
              </div>
            )}

            {/* Name */}
            <div className="flex w-full flex-col items-center gap-1.5">
              <Label className="text-center text-sm text-gray-900/60 dark:text-white/60">
                Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Narrative Arc Study Guide v2"
                className="w-full max-w-sm rounded-full text-center"
              />
            </div>

            {/* Description */}
            <div className="flex w-full flex-col items-center gap-1.5">
              <Label className="text-center text-sm text-gray-900/60 dark:text-white/60">
                Description
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Brief description of this template's approach"
                className="w-full max-w-sm rounded-full text-center"
              />
            </div>

            {/* Structure Prompt (hero field) */}
            <div className="flex w-full flex-col items-center gap-1.5">
              <Label className="text-center text-sm text-gray-900/60 dark:text-white/60">
                Structure Prompt
              </Label>
              <p className="text-center text-xs text-gray-900/40 dark:text-white/40">
                The Storytelling Structure That Guides Content Generation
              </p>
              <Textarea
                value={form.structurePrompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, structurePrompt: e.target.value }))
                }
                placeholder="Define the narrative structure, section flow, tone, and formatting instructions for this content type..."
                className="min-h-[300px] w-full rounded-2xl text-center font-mono text-sm"
                rows={14}
              />
            </div>

            {/* Error */}
            {formError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-red-600 dark:text-red-400"
              >
                {formError}
              </motion.p>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="w-full max-w-sm rounded-full bg-[#5227FF] text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DestructiveConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Template"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        onConfirmed={handleDeleteConfirmed}
      />
    </div>
  );
}
