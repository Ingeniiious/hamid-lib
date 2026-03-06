"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getNotificationStats,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCampaigns,
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

interface Template {
  id: number;
  name: string;
  title: string;
  body: string;
  url: string | null;
}

interface Campaign {
  id: number;
  title: string;
  body: string;
  target: string;
  targetUserId: string | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: string;
  statsSent: number;
  statsFailed: number;
  createdAt: Date;
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
}

interface UserResult {
  id: string;
  name: string;
  email: string;
}

const inputClass =
  "h-10 w-full rounded-lg border border-gray-900/15 bg-gray-900/5 px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus-visible:ring-white/30";
const textareaClass =
  "w-full rounded-lg border border-gray-900/15 bg-gray-900/5 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus-visible:ring-white/30";
const labelClass =
  "mb-1 block text-xs font-medium text-gray-500 dark:text-white/50";
const cardClass =
  "rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10";
const btnPrimary =
  "rounded-lg bg-[#5227FF] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40";
const btnSecondary =
  "rounded-lg bg-gray-900/5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10";

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("send");
  const [stats, setStats] = useState<{
    totalSubscriptions: number;
    uniqueUsers: number;
    activeAutomations: number;
  } | null>(null);

  useEffect(() => {
    getNotificationStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="px-6 py-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="mx-auto max-w-2xl"
      >
        <h1 className="font-display text-2xl font-light text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
          Campaigns, automations, templates, and delivery history.
        </p>

        {/* Stats */}
        {stats && (
          <div className="mt-4 flex gap-3">
            <div className={`flex-1 ${cardClass}`}>
              <p className="text-2xl font-light text-gray-900 dark:text-white">
                {stats.uniqueUsers}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Users
              </p>
            </div>
            <div className={`flex-1 ${cardClass}`}>
              <p className="text-2xl font-light text-gray-900 dark:text-white">
                {stats.totalSubscriptions}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Devices
              </p>
            </div>
            <div className={`flex-1 ${cardClass}`}>
              <p className="text-2xl font-light text-gray-900 dark:text-white">
                {stats.activeAutomations}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Automations
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" className="mt-6 flex gap-1 rounded-lg bg-gray-900/5 p-0.5 dark:bg-white/10">
          {(["send", "templates", "automations", "history"] as Tab[]).map(
            (t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium capitalize transition-all duration-200 ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/60"
                }`}
              >
                {t}
              </button>
            )
          )}
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {tab === "send" && (
              <motion.div
                key="send"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                <SendTab
                  onSent={() => getNotificationStats().then(setStats)}
                />
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
      </motion.div>
    </div>
  );
}

/* ── Variable Chips ────────────────────────────────────────── */

function VariableChips({
  onInsert,
}: {
  onInsert: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onInsert(v.key)}
          className="rounded-full bg-gray-900/5 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/50 dark:hover:bg-white/15"
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

function SendTab({ onSent }: { onSent: () => void }) {
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
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent?: number;
    failed?: number;
    error?: string;
    status?: string;
  } | null>(null);
  // Track which field was last focused for variable chip insertion
  const lastFocusedField = useRef<"title" | "body">("body");

  // Audience data
  const [universities, setUniversities] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<{ id: number; name: string }[]>(
    []
  );
  const [programs, setPrograms] = useState<{ id: number; name: string }[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  useEffect(() => {
    getTemplates().then((t) => setTemplates(t as Template[]));
  }, []);

  // Load audience data on mount
  useEffect(() => {
    getUniversities().then(setUniversities).catch(() => {});
    getFaculties()
      .then(setFaculties)
      .catch(() => {});
  }, []);

  // Load programs when faculty changes
  useEffect(() => {
    if (target === "program" && selectedFaculty) {
      getPrograms(selectedFaculty)
        .then(setPrograms)
        .catch(() => {});
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

  // User search
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
    if (scheduling && scheduledAt && new Date(scheduledAt) <= new Date()) return false;
    return true;
  };

  const handleSend = async () => {
    if (!canSend()) return;
    setSending(true);
    setResult(null);
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
      onSent();
    } catch {
      setResult({ error: "Failed to send." });
    }
    setSending(false);
  };

  return (
    <div className={cardClass}>
      {/* Template picker */}
      {templates.length > 0 && (
        <div className="mb-4">
          <label className={labelClass}>Use Template</label>
          <select
            value={selectedTemplate || ""}
            onChange={(e) =>
              e.target.value
                ? applyTemplate(Number(e.target.value))
                : setSelectedTemplate(null)
            }
            className={inputClass}
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
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => (lastFocusedField.current = "title")}
            placeholder="Hey {{name}}!"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastFocusedField.current = "body")}
            rows={3}
            placeholder="You've been with us for {{days}} days..."
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Click URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Variables — inserts into last focused field (title or body) */}
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
          <label className={labelClass}>Target Audience</label>
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-900/5 p-0.5 dark:bg-white/10">
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
                className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition-all duration-200 ${
                  target === t.value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/60"
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
              <div className="flex items-center justify-between rounded-lg bg-gray-900/5 px-3 py-2 dark:bg-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/50">
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserQuery("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className={inputClass}
                />
                {userResults.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-900/10 bg-white shadow-lg dark:border-white/15 dark:bg-[var(--background)]">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserResults([]);
                          setUserQuery("");
                        }}
                        className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-gray-900/5 dark:hover:bg-white/10"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">
                          {u.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-white/50">
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
            className={inputClass}
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
            className={inputClass}
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
              className={inputClass}
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
                className={inputClass}
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
              className="h-4 w-4 rounded border-gray-300 accent-[#5227FF]"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              Schedule For Later
            </span>
          </label>
          {scheduling && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={`mt-2 ${inputClass}`}
            />
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !canSend()}
          className={`mt-1 ${btnPrimary}`}
        >
          {sending
            ? "Sending..."
            : scheduling && scheduledAt
              ? "Schedule"
              : "Send Now"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
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
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const lastFocusedField = useRef<"title" | "body">("body");

  const load = useCallback(() => {
    getTemplates().then((t) => setTemplates(t as Template[]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setTitle("");
    setBody("");
    setUrl("");
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (t: Template) => {
    setEditing(t);
    setCreating(false);
    setName(t.name);
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url || "");
  };

  const handleSave = async () => {
    if (!name.trim() || !title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, { name, title, body, url });
      } else {
        await createTemplate({ name, title, body, url });
      }
      resetForm();
      load();
    } catch {
      alert("Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTemplate(id);
      if (editing?.id === id) resetForm();
      load();
    } catch {
      alert("Failed to delete template.");
    }
  };

  const showForm = creating || editing;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-white/70">
          {templates.length} Template{templates.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => {
            resetForm();
            setCreating(true);
          }}
          className="rounded-lg bg-[#5227FF] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          New Template
        </button>
      </div>

      {templates.map((t) => (
        <div
          key={t.id}
          className={`${cardClass} cursor-pointer transition-all duration-200 ${
            editing?.id === t.id
              ? "ring-2 ring-[#5227FF]/30"
              : "hover:border-gray-900/20 dark:hover:border-white/25"
          }`}
          onClick={() => startEdit(t)}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-white/50">
                {t.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-white/30">
                {t.body.slice(0, 80)}
                {t.body.length > 80 ? "..." : ""}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(t.id);
              }}
              className="ml-3 shrink-0 text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-white/30 dark:hover:text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {templates.length === 0 && !showForm && (
        <div className={`${cardClass} text-center`}>
          <p className="text-sm text-gray-500 dark:text-white/50">
            No templates yet. Create one to reuse notification messages.
          </p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className={cardClass}
          >
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              {editing ? "Edit Template" : "New Template"}
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome Back"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Notification Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => (lastFocusedField.current = "title")}
                  placeholder="Hey {{name}}!"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Notification Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => (lastFocusedField.current = "body")}
                  rows={3}
                  placeholder="You've been with us for {{days}} days..."
                  className={textareaClass}
                />
              </div>
              <div>
                <label className={labelClass}>Click URL (optional)</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/dashboard"
                  className={inputClass}
                />
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

              <div className="flex gap-2">
                <button onClick={resetForm} className={`flex-1 ${btnSecondary}`}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    saving || !name.trim() || !title.trim() || !body.trim()
                  }
                  className={`flex-1 ${btnPrimary}`}
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Automations Tab ───────────────────────────────────────── */

function AutomationsTab() {
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<AutomationRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("welcome");
  const [triggerDays, setTriggerDays] = useState<string>("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      getAutomations().then((a) => setAutomations(a as AutomationRow[])),
      getTemplates().then((t) => setTemplates(t as Template[])),
    ]).finally(() => setLoading(false));
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
    setCreating(false);
  };

  const startEdit = (a: AutomationRow) => {
    setEditing(a);
    setCreating(false);
    setName(a.name);
    setTrigger(a.trigger);
    setTriggerDays(a.triggerDays?.toString() || "");
    setTemplateId(a.templateId);
    setEnabled(a.enabled);
  };

  const triggerType = TRIGGER_TYPES.find((t) => t.value === trigger);

  const handleSave = async () => {
    if (!name.trim() || !templateId) return;
    if (triggerType?.needsDays && !triggerDays) return;
    setSaving(true);
    try {
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
    } catch {
      alert("Failed to save automation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAutomation(id);
      if (editing?.id === id) resetForm();
      load();
    } catch {
      alert("Failed to delete automation.");
    }
  };

  const handleToggle = async (id: number, currentEnabled: boolean) => {
    // Optimistic update
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !currentEnabled } : a))
    );
    try {
      await toggleAutomation(id, !currentEnabled);
      load();
    } catch {
      // Revert on error
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: currentEnabled } : a))
      );
    }
  };

  const showForm = creating || editing;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-white/70">
            {automations.length} Automation
            {automations.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-white/30">
            Runs daily at 9:00 AM Istanbul time
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setCreating(true);
          }}
          className="rounded-lg bg-[#5227FF] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          New Automation
        </button>
      </div>

      {automations.map((a) => (
        <div
          key={a.id}
          className={`${cardClass} cursor-pointer transition-all duration-200 ${
            editing?.id === a.id
              ? "ring-2 ring-[#5227FF]/30"
              : "hover:border-gray-900/20 dark:hover:border-white/25"
          }`}
          onClick={() => startEdit(a)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {a.name}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    a.enabled
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-gray-500/10 text-gray-500 dark:text-white/40"
                  }`}
                >
                  {a.enabled ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                {TRIGGER_TYPES.find((t) => t.value === a.trigger)?.label ||
                  a.trigger}
                {a.triggerDays !== null ? ` (${a.triggerDays} days)` : ""}
                {" — "}
                {a.templateName}
              </p>
            </div>
            <div className="ml-3 flex items-center gap-2">
              <button
                role="switch"
                aria-checked={a.enabled}
                aria-label={`Toggle ${a.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(a.id, a.enabled);
                }}
                className={`relative h-6 w-10 rounded-full transition-colors ${
                  a.enabled ? "bg-[#5227FF]" : "bg-gray-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    a.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(a.id);
                }}
                className="text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-white/30 dark:hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {automations.length === 0 && !showForm && (
        <div className={`${cardClass} text-center`}>
          <p className="text-sm text-gray-500 dark:text-white/50">
            No automations yet. Create one to automatically send notifications
            based on user events.
          </p>
        </div>
      )}

      {templates.length === 0 && !showForm && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          Create a template first (Templates tab) before setting up automations.
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className={cardClass}
          >
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              {editing ? "Edit Automation" : "New Automation"}
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome Day 1"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Trigger Type</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className={inputClass}
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
                  <label className={labelClass}>
                    Days{" "}
                    {trigger === "welcome"
                      ? "(after signup)"
                      : trigger === "inactivity"
                        ? "(of no activity)"
                        : "(on platform)"}
                  </label>
                  <input
                    type="number"
                    value={triggerDays}
                    onChange={(e) => setTriggerDays(e.target.value)}
                    placeholder="e.g. 7"
                    min="1"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Template</label>
                <select
                  value={templateId || ""}
                  onChange={(e) =>
                    setTemplateId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className={inputClass}
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
                  className="h-4 w-4 rounded border-gray-300 accent-[#5227FF]"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-white/60">
                  Enabled
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={resetForm} className={`flex-1 ${btnSecondary}`}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !name.trim() ||
                    !templateId ||
                    (triggerType?.needsDays && !triggerDays)
                  }
                  className={`flex-1 ${btnPrimary}`}
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── History Tab ───────────────────────────────────────────── */

function HistoryTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns()
      .then((c) => setCampaigns(c as Campaign[]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-600 dark:text-green-400";
      case "scheduled":
        return "text-blue-600 dark:text-blue-400";
      case "sending":
        return "text-amber-600 dark:text-amber-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-500 dark:text-white/50";
    }
  };

  const targetLabel = (target: string, targetUserId: string | null) => {
    switch (target) {
      case "all":
        return "All Users";
      case "user":
        return `User ${targetUserId?.slice(0, 8)}...`;
      case "university":
        return `University: ${targetUserId}`;
      case "faculty":
        return `Faculty #${targetUserId}`;
      case "program":
        return `Program #${targetUserId}`;
      default:
        return target;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className={`${cardClass} text-center`}>
        <p className="text-sm text-gray-500 dark:text-white/50">
          No campaigns sent yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {campaigns.map((c) => (
        <div key={c.id} className={cardClass}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {c.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-white/50">
                {c.body.slice(0, 100)}
              </p>
            </div>
            <span
              className={`ml-3 shrink-0 text-xs font-medium capitalize ${statusColor(c.status)}`}
            >
              {c.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400 dark:text-white/30">
            <span>{targetLabel(c.target, c.targetUserId)}</span>
            {c.status === "sent" && (
              <span>
                Sent: {c.statsSent} / Failed: {c.statsFailed}
              </span>
            )}
            {c.scheduledAt && (
              <span>
                Scheduled: {new Date(c.scheduledAt).toLocaleString()}
              </span>
            )}
            {c.sentAt && (
              <span>Delivered: {new Date(c.sentAt).toLocaleString()}</span>
            )}
            <span>Created: {new Date(c.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
