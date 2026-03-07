"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Users,
  Lightning,
  FileText,
  PaperPlaneTilt,
  Trash,
  PencilSimple,
  Plus,
  ClockCountdown,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatsCard } from "@/components/admin/StatsCard";
import { DataTable } from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listCampaigns,
  createCampaign,
  searchUsers,
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  getUniversities,
  getFaculties,
  getPrograms,
} from "./actions";
import { TEMPLATE_VARIABLES, TRIGGER_TYPES } from "@/lib/notification-constants";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Tab = "send" | "templates" | "automations" | "history";

interface TemplateTranslation {
  title: string;
  body: string;
}

interface Template {
  id: number;
  name: string;
  title: string;
  body: string;
  url: string | null;
  translations: Record<string, TemplateTranslation> | null;
}

interface CampaignRow {
  id: number;
  title: string;
  body: string;
  target: string;
  targetUserId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  statsSent: number;
  statsFailed: number;
  createdAt: string;
}

interface AutomationRow {
  id: number;
  name: string;
  trigger: string;
  triggerDays: number | null;
  templateId: number;
  enabled: boolean;
  createdAt: Date;
  templateName: string;
  templateTitle: string;
  templateBody: string;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
}

interface NotificationsClientProps {
  stats: {
    totalSubscriptions: number;
    uniqueUsers: number;
    activeAutomations: number;
    totalTemplates: number;
  };
}

export function NotificationsClient({ stats }: NotificationsClientProps) {
  const [tab, setTab] = useState<Tab>("send");

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Subscribed Users"
          value={stats.uniqueUsers}
          icon={<Users size={24} weight="duotone" />}
          index={0}
        />
        <StatsCard
          title="Device Subscriptions"
          value={stats.totalSubscriptions}
          icon={<Bell size={24} weight="duotone" />}
          index={1}
        />
        <StatsCard
          title="Active Automations"
          value={stats.activeAutomations}
          icon={<Lightning size={24} weight="duotone" />}
          index={2}
        />
        <StatsCard
          title="Templates"
          value={stats.totalTemplates}
          icon={<FileText size={24} weight="duotone" />}
          index={3}
        />
      </div>

      {/* Pill tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.4 }}
      >
        <div className="flex gap-1">
          {(
            [
              { key: "send", label: "Send" },
              { key: "templates", label: "Templates" },
              { key: "automations", label: "Automations" },
              { key: "history", label: "History" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-900/5 text-gray-900/60 hover:text-gray-900 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === "send" && (
          <motion.div
            key="send"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <SendTab />
          </motion.div>
        )}
        {tab === "templates" && (
          <motion.div
            key="templates"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <TemplatesTab />
          </motion.div>
        )}
        {tab === "automations" && (
          <motion.div
            key="automations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <AutomationsTab />
          </motion.div>
        )}
        {tab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <HistoryTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Variable Chips ────────────────────────────────────────── */

function VariableChips({ onInsert }: { onInsert: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onInsert(v.key)}
          className="rounded-full bg-gray-900/5 px-2.5 py-1 text-[10px] font-medium text-gray-900/50 transition-colors hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/50 dark:hover:bg-white/15"
          title={v.desc}
        >
          {v.key}{" "}
          <span className="opacity-50">— {v.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Send Tab ──────────────────────────────────────────────── */

type TargetType = "all" | "user" | "university" | "faculty" | "program";

function SendTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [target, setTarget] = useState<TargetType>("all");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    sent?: number;
    failed?: number;
    error?: string;
    status?: string;
  } | null>(null);
  const lastFocusedField = useRef<"title" | "body">("body");

  // Audience data
  const [universities, setUniversities] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<{ id: number; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: number; name: string }[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  useEffect(() => {
    getTemplates().then((t) => setTemplates(t as Template[]));
    getUniversities().then(setUniversities).catch(() => {});
    getFaculties().then(setFaculties).catch(() => {});
  }, []);

  useEffect(() => {
    if (target === "program" && selectedFaculty) {
      getPrograms(selectedFaculty).then(setPrograms).catch(() => {});
    }
  }, [selectedFaculty, target]);

  const applyTemplate = (id: number) => {
    const t = templates.find((t) => t.id === id);
    if (t) {
      setTitle(t.title);
      setBody(t.body);
      setUrl(t.url || "/dashboard");
      setSelectedTemplate(id);
    }
  };

  useEffect(() => {
    if (target !== "user" || userQuery.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(userQuery).then(setUserResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery, target]);

  const getTargetValue = (): string | undefined => {
    switch (target) {
      case "user":
        return selectedUser?.id;
      case "university":
        return selectedUniversity || undefined;
      case "faculty":
        return selectedFaculty?.toString();
      case "program":
        return selectedProgram?.toString();
      default:
        return undefined;
    }
  };

  const canSend = () => {
    if (!title.trim() || !body.trim()) return false;
    if (target === "user" && !selectedUser) return false;
    if (target === "university" && !selectedUniversity) return false;
    if (target === "faculty" && !selectedFaculty) return false;
    if (target === "program" && !selectedProgram) return false;
    if (scheduling && !scheduledAt) return false;
    if (scheduling && scheduledAt && new Date(scheduledAt) <= new Date())
      return false;
    return true;
  };

  const handleSend = () => {
    if (!canSend()) return;
    setResult(null);
    startTransition(async () => {
      try {
        const res = await createCampaign({
          templateId: selectedTemplate || undefined,
          title,
          body,
          url,
          target,
          targetUserId: getTargetValue(),
          scheduledAt: scheduling && scheduledAt ? scheduledAt : undefined,
        });
        setResult(res);
      } catch {
        setResult({ error: "Failed to send." });
      }
    });
  };

  const inputStyles =
    "border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10";

  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      {/* Template picker */}
      {templates.length > 0 && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
            Use Template
          </label>
          <select
            value={selectedTemplate || ""}
            onChange={(e) =>
              e.target.value
                ? applyTemplate(Number(e.target.value))
                : setSelectedTemplate(null)
            }
            className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus-visible:ring-white/30"
          >
            <option value="">Custom Message</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => (lastFocusedField.current = "title")}
            placeholder="Hey {{name}}!"
            className={inputStyles}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
            Body
          </label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastFocusedField.current = "body")}
            rows={3}
            placeholder="You've been with us for {{days}} days..."
            className={inputStyles}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
            Opens Page
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputStyles}
          />
          <p className="mt-1 text-[10px] text-gray-900/30 dark:text-white/30">
            Where the user goes when they tap the notification. Default:
            /dashboard
          </p>
        </div>

        <VariableChips
          onInsert={(key) => {
            if (lastFocusedField.current === "title") {
              setTitle((prev) => prev + key);
            } else {
              setBody((prev) => prev + key);
            }
          }}
        />

        {/* Target */}
        <div>
          <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
            Target Audience
          </label>
          <div className="flex gap-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "user", label: "User" },
                { value: "university", label: "University" },
                { value: "faculty", label: "Faculty" },
                { value: "program", label: "Program" },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTarget(t.value);
                  setSelectedUser(null);
                  setSelectedUniversity("");
                  setSelectedFaculty(null);
                  setSelectedProgram(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  target === t.value
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-900/5 text-gray-900/60 hover:text-gray-900 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target-specific pickers */}
        {target === "user" && (
          <div>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-2xl bg-gray-900/5 px-4 py-2.5 dark:bg-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-gray-900/40 dark:text-white/40">
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserQuery("");
                  }}
                  className="text-xs text-gray-900/40 hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className={inputStyles}
                />
                {userResults.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-2xl border border-gray-900/10 bg-white shadow-lg dark:border-white/15 dark:bg-gray-900">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserResults([]);
                          setUserQuery("");
                        }}
                        className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-gray-900/5 dark:hover:bg-white/10"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">
                          {u.name}
                        </span>
                        <span className="text-xs text-gray-900/40 dark:text-white/40">
                          {u.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {target === "university" && (
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            <option value="">Select University</option>
            {universities.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}

        {target === "faculty" && (
          <select
            value={selectedFaculty || ""}
            onChange={(e) =>
              setSelectedFaculty(e.target.value ? Number(e.target.value) : null)
            }
            className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            <option value="">Select Faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        {target === "program" && (
          <div className="flex flex-col gap-2">
            <select
              value={selectedFaculty || ""}
              onChange={(e) => {
                const fId = e.target.value ? Number(e.target.value) : null;
                setSelectedFaculty(fId);
                setSelectedProgram(null);
              }}
              className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
            >
              <option value="">Select Faculty First</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {selectedFaculty && (
              <select
                value={selectedProgram || ""}
                onChange={(e) =>
                  setSelectedProgram(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <option value="">Select Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Schedule toggle */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scheduling}
              onChange={(e) => {
                setScheduling(e.target.checked);
                if (!e.target.checked) setScheduledAt("");
              }}
              className="h-4 w-4 rounded border-gray-300 accent-gray-900 dark:accent-white"
            />
            <span className="text-xs font-medium text-gray-900/60 dark:text-white/60">
              Schedule For Later
            </span>
          </label>
          {scheduling && (
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={`mt-2 ${inputStyles}`}
            />
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={isPending || !canSend()}
          className="mt-1 rounded-full"
        >
          <PaperPlaneTilt size={16} weight="duotone" className="mr-1.5" />
          {isPending
            ? "Sending..."
            : scheduling && scheduledAt
              ? "Schedule"
              : "Send Now"}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            result.error
              ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
              : result.status === "scheduled"
                ? "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400"
                : "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400"
          }`}
        >
          {result.error
            ? result.error
            : result.status === "scheduled"
              ? "Campaign scheduled successfully."
              : `Sent ${result.sent} notification${result.sent !== 1 ? "s" : ""}${result.failed ? `, ${result.failed} failed` : ""}`}
        </motion.div>
      )}
    </div>
  );
}

/* ── Templates Tab ─────────────────────────────────────────── */

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [faTitle, setFaTitle] = useState("");
  const [faBody, setFaBody] = useState("");
  const [trTitle, setTrTitle] = useState("");
  const [trBody, setTrBody] = useState("");
  const [showTranslations, setShowTranslations] = useState(true);
  const lastFocusedField = useRef<"title" | "body">("body");

  const load = useCallback(() => {
    startTransition(async () => {
      const t = await getTemplates();
      setTemplates(t as Template[]);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setTitle("");
    setBody("");
    setUrl("");
    setFaTitle("");
    setFaBody("");
    setTrTitle("");
    setTrBody("");
    setShowTranslations(true);
    setEditing(null);
    setDialogOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url || "");
    setFaTitle(t.translations?.fa?.title || "");
    setFaBody(t.translations?.fa?.body || "");
    setTrTitle(t.translations?.tr?.title || "");
    setTrBody(t.translations?.tr?.body || "");
    setShowTranslations(!!(t.translations?.fa?.title || t.translations?.tr?.title));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !title.trim() || !body.trim()) return;
    const translations: Record<string, { title: string; body: string }> = {};
    if (faTitle.trim() && faBody.trim()) translations.fa = { title: faTitle, body: faBody };
    if (trTitle.trim() && trBody.trim()) translations.tr = { title: trTitle, body: trBody };
    const hasTranslations = Object.keys(translations).length > 0;
    startTransition(async () => {
      if (editing) {
        await updateTemplate(editing.id, { name, title, body, url, translations: hasTranslations ? translations : undefined });
      } else {
        await createTemplate({ name, title, body, url, translations: hasTranslations ? translations : undefined });
      }
      resetForm();
      load();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteTemplate(id);
      if (editing?.id === id) resetForm();
      load();
    });
  };

  const inputStyles =
    "border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10";

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: Template) => (
        <span className="font-medium">{item.name}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (item: Template) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {item.title}
        </span>
      ),
    },
    {
      key: "body",
      header: "Body",
      render: (item: Template) => (
        <span className="max-w-xs truncate text-sm text-gray-900/50 dark:text-white/50">
          {item.body.slice(0, 80)}
          {item.body.length > 80 ? "..." : ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Template) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(item);
            }}
            className="rounded-full p-1.5 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <PencilSimple size={16} weight="duotone" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="rounded-full p-1.5 text-red-500/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-900/60 dark:text-white/60">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          onClick={openCreate}
          className="rounded-full"
        >
          <Plus size={16} weight="bold" className="mr-1" />
          New Template
        </Button>
      </div>

      <DataTable<Template>
        columns={columns}
        data={templates}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        loading={isPending && templates.length === 0}
        emptyMessage="No templates yet."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              {editing ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Template Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome Back"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Notification Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => (lastFocusedField.current = "title")}
                placeholder='Hey {{name}}!'
                className={inputStyles}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Notification Body
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => (lastFocusedField.current = "body")}
                rows={3}
                placeholder="You've been with us for {{days}} days..."
                className={inputStyles}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Opens Page (optional)
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/dashboard"
                className={inputStyles}
              />
            </div>
            {/* Translations toggle */}
            <button
              type="button"
              onClick={() => setShowTranslations(!showTranslations)}
              className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              <span>{showTranslations ? "Hide" : "Add"} Translations (FA / TR)</span>
            </button>

            {showTranslations && (
              <div className="space-y-3 rounded-lg border border-purple-200/50 bg-purple-50/30 p-3 dark:border-purple-500/20 dark:bg-purple-900/10">
                <p className="text-[11px] font-medium text-purple-600/70 dark:text-purple-400/70">
                  Persian (FA) &mdash; use same {"{{variables}}"} as English
                </p>
                <Input
                  value={faTitle}
                  onChange={(e) => setFaTitle(e.target.value)}
                  placeholder="Persian title..."
                  className={inputStyles}
                  dir="rtl"
                />
                <Textarea
                  value={faBody}
                  onChange={(e) => setFaBody(e.target.value)}
                  rows={2}
                  placeholder="Persian body..."
                  className={inputStyles}
                  dir="rtl"
                />
                <p className="text-[11px] font-medium text-purple-600/70 dark:text-purple-400/70">
                  Turkish (TR)
                </p>
                <Input
                  value={trTitle}
                  onChange={(e) => setTrTitle(e.target.value)}
                  placeholder="Turkish title..."
                  className={inputStyles}
                />
                <Textarea
                  value={trBody}
                  onChange={(e) => setTrBody(e.target.value)}
                  rows={2}
                  placeholder="Turkish body..."
                  className={inputStyles}
                />
              </div>
            )}

            <VariableChips
              onInsert={(key) => {
                if (lastFocusedField.current === "title") {
                  setTitle((prev) => prev + key);
                } else {
                  setBody((prev) => prev + key);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetForm}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || !title.trim() || !body.trim()}
              className="rounded-full"
            >
              {isPending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Automations Tab ───────────────────────────────────────── */

function AutomationsTab() {
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRow | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("welcome");
  const [triggerDays, setTriggerDays] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(() => {
    startTransition(async () => {
      const [a, t] = await Promise.all([getAutomations(), getTemplates()]);
      setAutomations(a as AutomationRow[]);
      setTemplates(t as Template[]);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setTrigger("welcome");
    setTriggerDays("");
    setTemplateId(null);
    setEnabled(true);
    setEditing(null);
    setDialogOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (a: AutomationRow) => {
    setEditing(a);
    setName(a.name);
    setTrigger(a.trigger);
    setTriggerDays(a.triggerDays?.toString() || "");
    setTemplateId(a.templateId);
    setEnabled(a.enabled);
    setDialogOpen(true);
  };

  const triggerType = TRIGGER_TYPES.find((t) => t.value === trigger);

  const handleSave = () => {
    if (!name.trim() || !templateId) return;
    if (triggerType?.needsDays && !triggerDays) return;
    startTransition(async () => {
      const data = {
        name,
        trigger,
        triggerDays: triggerType?.needsDays ? parseInt(triggerDays) : undefined,
        templateId,
        enabled,
      };
      if (editing) {
        await updateAutomation(editing.id, data);
      } else {
        await createAutomation(data);
      }
      resetForm();
      load();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteAutomation(id);
      if (editing?.id === id) resetForm();
      load();
    });
  };

  const handleToggle = (id: number, currentEnabled: boolean) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !currentEnabled } : a))
    );
    startTransition(async () => {
      await toggleAutomation(id, !currentEnabled);
      load();
    });
  };

  const inputStyles =
    "border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10";

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: AutomationRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <Badge
            variant="outline"
            className={
              item.enabled
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
                : "border-gray-900/10 text-gray-900/40 dark:border-white/15 dark:text-white/40"
            }
          >
            {item.enabled ? "Active" : "Paused"}
          </Badge>
        </div>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      render: (item: AutomationRow) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {TRIGGER_TYPES.find((t) => t.value === item.trigger)?.label ||
            item.trigger}
          {item.triggerDays !== null ? ` (${item.triggerDays}d)` : ""}
        </span>
      ),
    },
    {
      key: "template",
      header: "Template",
      render: (item: AutomationRow) => (
        <span className="text-sm text-gray-900/50 dark:text-white/50">
          {item.templateName}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: AutomationRow) => (
        <div className="flex items-center justify-end gap-1">
          <button
            role="switch"
            aria-checked={item.enabled}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(item.id, item.enabled);
            }}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              item.enabled
                ? "bg-gray-900 dark:bg-white"
                : "bg-gray-300 dark:bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                item.enabled
                  ? "left-[18px] bg-white dark:bg-gray-900"
                  : "left-0.5 bg-white"
              }`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(item);
            }}
            className="rounded-full p-1.5 text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <PencilSimple size={16} weight="duotone" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="rounded-full p-1.5 text-red-500/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash size={16} weight="duotone" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-900/60 dark:text-white/60">
            {automations.length} automation{automations.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-gray-900/30 dark:text-white/30">
            Runs daily at 9:00 AM Istanbul time
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          disabled={templates.length === 0}
          className="rounded-full"
        >
          <Plus size={16} weight="bold" className="mr-1" />
          New Automation
        </Button>
      </div>

      {templates.length === 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          Create a template first (Templates tab) before setting up automations.
        </div>
      )}

      <DataTable<AutomationRow>
        columns={columns}
        data={automations}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        loading={isPending && automations.length === 0}
        emptyMessage="No automations yet."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              {editing ? "Edit Automation" : "New Automation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome Day 1"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Trigger Type
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.desc}
                  </option>
                ))}
              </select>
            </div>
            {triggerType?.needsDays && (
              <div>
                <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                  Days{" "}
                  {trigger === "welcome"
                    ? "(after signup)"
                    : trigger === "inactivity"
                      ? "(of no activity)"
                      : "(on platform)"}
                </label>
                <Input
                  type="number"
                  value={triggerDays}
                  onChange={(e) => setTriggerDays(e.target.value)}
                  placeholder="e.g. 7"
                  min={1}
                  className={inputStyles}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Template
              </label>
              <select
                value={templateId || ""}
                onChange={(e) =>
                  setTemplateId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="h-10 w-full rounded-full border border-gray-900/10 bg-white/50 px-4 text-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <option value="">Select a Template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-gray-900 dark:accent-white"
              />
              <span className="text-xs font-medium text-gray-900/60 dark:text-white/60">
                Enabled
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetForm}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isPending ||
                !name.trim() ||
                !templateId ||
                (triggerType?.needsDays ? !triggerDays : false)
              }
              className="rounded-full"
            >
              {isPending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── History Tab ───────────────────────────────────────────── */

function HistoryTab() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await listCampaigns({ page });
      setCampaigns(result.campaigns as CampaignRow[]);
      setTotalPages(result.totalPages);
    });
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
      scheduled:
        "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      sending:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      failed:
        "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
    return (
      colors[status] || "border-gray-900/10 text-gray-900/50 dark:border-white/15 dark:text-white/50"
    );
  };

  const targetLabel = (target: string, targetUserId: string | null) => {
    switch (target) {
      case "all":
        return "All Users";
      case "user":
        return `User ${targetUserId?.slice(0, 8)}...`;
      case "university":
        return `Uni: ${targetUserId}`;
      case "faculty":
        return `Faculty #${targetUserId}`;
      case "program":
        return `Program #${targetUserId}`;
      default:
        return target;
    }
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (item: CampaignRow) => (
        <div className="min-w-0">
          <span className="font-medium">{item.title}</span>
          <p className="mt-0.5 max-w-xs truncate text-xs text-gray-900/40 dark:text-white/40">
            {item.body.slice(0, 80)}
          </p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (item: CampaignRow) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {targetLabel(item.target, item.targetUserId)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: CampaignRow) => (
        <Badge variant="outline" className={statusBadge(item.status)}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "stats",
      header: "Delivery",
      render: (item: CampaignRow) =>
        item.status === "sent" ? (
          <span className="text-sm text-gray-900/60 dark:text-white/60">
            {item.statsSent} sent
            {item.statsFailed > 0 && (
              <span className="text-red-500"> / {item.statsFailed} failed</span>
            )}
          </span>
        ) : item.scheduledAt ? (
          <span className="flex items-center gap-1 text-xs text-gray-900/40 dark:text-white/40">
            <ClockCountdown size={14} weight="duotone" />
            {new Date(item.scheduledAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : (
          <span className="text-gray-900/30 dark:text-white/30">
            {"\u2014"}
          </span>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: CampaignRow) => (
        <span className="text-xs text-gray-900/40 dark:text-white/40">
          {new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <DataTable<CampaignRow>
      columns={columns}
      data={campaigns}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      loading={isPending && campaigns.length === 0}
      emptyMessage="No campaigns sent yet."
    />
  );
}
