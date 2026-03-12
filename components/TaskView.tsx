"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { OptionPicker } from "@/components/OptionPicker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import {
  getTasks,
  getUserCourses,
  addTask,
  updateTask,
  toggleTaskComplete,
  toggleSubtaskComplete,
  deleteTask,
} from "@/app/(main)/dashboard/space/tasks/actions";

type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  courseId?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  subtasks: { id: string; title: string; completed: boolean }[];
  reminder: "none" | "at_deadline" | "daily" | "weekly";
  notify: boolean;
  displayOrder: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type Course = { id: string; title: string };

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const PRIORITY_COLORS = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/15 text-red-700 dark:text-red-400",
} as const;

function generateId() {
  return crypto.randomUUID();
}

function getDueDateInfo(dueDate: string | undefined, t: (key: string) => string) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: t("tasks.overdue"), className: "text-red-500" };
  if (diff === 0) return { label: t("tasks.dueToday"), className: "text-amber-600 dark:text-amber-400" };
  if (diff === 1) return { label: t("tasks.dueTomorrow"), className: "text-amber-600 dark:text-amber-400" };
  return { label: `${diff} ${t("tasks.daysLeft")}`, className: "text-gray-900/50 dark:text-white/50" };
}

// ─── Filter Tabs ────────────────────────────────────────────

function FilterTabs({
  filter,
  onFilter,
  counts,
}: {
  filter: "all" | "active" | "done";
  onFilter: (f: "all" | "active" | "done") => void;
  counts: { all: number; active: number; done: number };
}) {
  const { t } = useTranslation();
  const tabs = [
    { key: "all" as const, label: t("tasks.all"), count: counts.all },
    { key: "active" as const, label: t("tasks.active"), count: counts.active },
    { key: "done" as const, label: t("tasks.done"), count: counts.done },
  ];

  return (
    <div className="flex items-center justify-center gap-1 rounded-full bg-gray-900/5 p-1 dark:bg-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilter(tab.key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
            filter === tab.key
              ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
              : "text-gray-900/50 hover:text-gray-900/70 dark:text-white/50 dark:hover:text-white/70"
          }`}
        >
          {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────

function TaskCard({
  task: t_,
  courses,
  onToggle,
  onToggleSubtask,
  onEdit,
  onDelete,
}: {
  task: Task;
  courses: Course[];
  onToggle: (id: string, completed: boolean) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const isCompleted = t_.status === "completed";
  const dueInfo = getDueDateInfo(t_.dueDate, t);
  const course = courses.find((c) => c.id === t_.courseId);
  const completedSubtasks = t_.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = t_.subtasks.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className={`group rounded-2xl border p-4 transition-colors duration-300 ${
        isCompleted
          ? "border-gray-900/5 bg-gray-900/[0.02] dark:border-white/5 dark:bg-white/[0.02]"
          : "border-gray-900/10 bg-white/50 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      {/* Top row: checkbox + title + priority */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(t_.id, !isCompleted)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            isCompleted
              ? "border-[#5227FF] bg-[#5227FF]"
              : "border-gray-900/20 hover:border-[#5227FF]/50 dark:border-white/20 dark:hover:border-[#5227FF]/50"
          }`}
        >
          {isCompleted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                isCompleted
                  ? "text-gray-900/30 line-through dark:text-white/30"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {t_.title}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[t_.priority]}`}>
              {t(`tasks.${t_.priority}`)}
            </span>
          </div>

          {/* Description */}
          {t_.description && (
            <p className={`mt-1 text-xs ${isCompleted ? "text-gray-900/20 dark:text-white/20" : "text-gray-900/50 dark:text-white/50"}`}>
              {t_.description}
            </p>
          )}

          {/* Meta: due date + course */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {dueInfo && !isCompleted && (
              <span className={`text-xs font-medium ${dueInfo.className}`}>{dueInfo.label}</span>
            )}
            {t_.dueDate && (
              <span className="text-xs text-gray-900/40 dark:text-white/40">
                {new Date(t_.dueDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
            {course && (
              <span className="rounded-full bg-[#5227FF]/10 px-2 py-0.5 text-[10px] font-medium text-[#5227FF] dark:text-[#8B6FFF]">
                {course.title}
              </span>
            )}
            {t_.reminder !== "none" && (
              <span className="text-[10px] text-gray-900/40 dark:text-white/40">
                🔔 {t(`tasks.reminder${t_.reminder.charAt(0).toUpperCase() + t_.reminder.slice(1).replace("_", "")}`)}
              </span>
            )}
          </div>

          {/* Subtasks */}
          {totalSubtasks > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-900/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#5227FF] transition-all duration-500"
                    style={{ width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-900/40 dark:text-white/40">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              {t_.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onToggleSubtask(t_.id, sub.id, !sub.completed)}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      sub.completed
                        ? "border-[#5227FF]/50 bg-[#5227FF]/50"
                        : "border-gray-900/15 dark:border-white/15"
                    }`}
                  >
                    {sub.completed && (
                      <svg width="7" height="6" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-xs transition-all duration-300 ${
                      sub.completed
                        ? "text-gray-900/25 line-through dark:text-white/25"
                        : "text-gray-900/70 dark:text-white/70"
                    }`}
                  >
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions (visible on hover / always on mobile) */}
      <div className="mt-3 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100">
        <button
          onClick={() => onEdit(t_)}
          className="rounded-full px-3 py-1 text-xs text-gray-900/50 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {t("tasks.editTask")}
        </button>
        <button
          onClick={() => onDelete(t_.id)}
          className="rounded-full px-3 py-1 text-xs text-red-500/60 transition-colors hover:bg-red-500/5 hover:text-red-500"
        >
          {t("common.delete")}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Task Form Modal (matches CalendarView event form) ──────

function TaskFormModal({
  editingTask,
  courses,
  onSave,
  onDelete,
  onClose,
}: {
  editingTask: Task | null;
  courses: Course[];
  onSave: (data: {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    courseId?: string;
    priority: string;
    subtasks: { id: string; title: string; completed: boolean }[];
    reminder: string;
    notify: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEditing = !!editingTask;
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(editingTask?.description || "");
  const [dueDate, setDueDate] = useState(editingTask?.dueDate || "");
  const [courseId, setCourseId] = useState(editingTask?.courseId || "");
  const [priority, setPriority] = useState(editingTask?.priority || "medium");
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    editingTask?.subtasks || []
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [reminder, setReminder] = useState(editingTask?.reminder || "none");
  const [notify, setNotify] = useState(editingTask?.notify ?? true);

  const reminderOptions = useMemo(() => [
    { value: "none" as const, label: t("tasks.reminderNone") },
    { value: "at_deadline" as const, label: t("tasks.reminderAtDeadline") },
    { value: "daily" as const, label: t("tasks.reminderDaily") },
    { value: "weekly" as const, label: t("tasks.reminderWeekly") },
  ], [t]);

  const courseOptions = useMemo(() => [
    { value: "", label: t("tasks.noCourse") },
    ...courses.map((c) => ({ value: c.id, label: c.title })),
  ], [courses, t]);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: generateId(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      id: editingTask?.id || generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      courseId: courseId || undefined,
      priority,
      subtasks,
      reminder,
      notify,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease }}
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      {/* Card — centered, matches calendar form exactly */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2, ease }}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85vh] max-w-md -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-900/10 bg-white p-5 shadow-xl dark:border-white/15 dark:bg-[var(--background)]"
      >
        <h3 className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
          {isEditing ? t("tasks.editTask") : t("tasks.newTask")}
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          {/* Title — same as calendar title input */}
          <input
            ref={titleRef}
            type="text"
            placeholder={t("tasks.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
          />

          {/* Priority toggle — same pattern as category pills */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {(["low", "medium", "high"] as const).map((p) => {
              const config = {
                low: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
                medium: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
                high: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
              }[p];
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    priority === p
                      ? `${config.bg} ${config.text} ring-1 ring-current/20`
                      : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                  {t(`tasks.${p}`)}
                </button>
              );
            })}
          </div>

          {/* Due date — shadcn Popover + Calendar */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:focus-visible:ring-white/30 ${
                  dueDate
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-900/40 dark:text-white/50"
                }`}
              >
                {dueDate
                  ? format(parse(dueDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
                  : t("tasks.noDueDate")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={dueDate ? parse(dueDate, "yyyy-MM-dd", new Date()) : undefined}
                onSelect={(date) => {
                  setDueDate(date ? format(date, "yyyy-MM-dd") : "");
                }}
                defaultMonth={dueDate ? parse(dueDate, "yyyy-MM-dd", new Date()) : undefined}
              />
              {dueDate && (
                <div className="border-t px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="w-full rounded-full py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/5"
                  >
                    {t("tasks.noDueDate")}
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Course — OptionPicker like calendar dropdowns */}
          {courses.length > 0 && (
            <OptionPicker
              options={courseOptions}
              value={courseId}
              onChange={setCourseId}
              placeholder={t("tasks.selectCourse")}
            />
          )}

          {/* Reminder — OptionPicker */}
          <OptionPicker
            options={reminderOptions}
            value={reminder}
            onChange={(v) => setReminder(v as Task["reminder"])}
            placeholder={t("tasks.reminder")}
          />

          {/* Notify toggle — same as calendar notify button */}
          {reminder !== "none" && (
            <button
              type="button"
              onClick={() => setNotify((v) => !v)}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                notify
                  ? "border-[#5227FF]/20 bg-[#5227FF]/5 text-[#5227FF] dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10 dark:text-[#8B6FFF]"
                  : "border-gray-900/15 bg-gray-900/5 text-gray-900/40 dark:border-white/20 dark:bg-white/10 dark:text-white/40"
              }`}
            >
              {notify ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              )}
              {notify ? t("tasks.notifyOn") : t("tasks.notifyOff")}
            </button>
          )}

          {/* Description — same input style as calendar note */}
          <input
            type="text"
            placeholder={t("tasks.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
          />

          {/* Subtasks — section with border like calendar location section */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-gray-900/10 bg-gray-900/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-center text-xs font-medium text-gray-900/50 dark:text-white/50">
              {t("tasks.addSubtask")}
            </p>
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-900/70 dark:text-white/70">{sub.title}</span>
                <button
                  onClick={() => handleRemoveSubtask(sub.id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900/40 dark:text-white/40"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                placeholder={t("tasks.subtaskPlaceholder")}
                className="h-8 min-w-0 flex-1 rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-xs text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-30 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>
          </div>

          {/* Action buttons — same as calendar */}
          <div className="mt-1 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-gray-900/5 py-2.5 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex-1 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-40"
            >
              {isEditing ? t("common.save") : t("tasks.addTask")}
            </button>
          </div>

          {/* Delete button — visible in edit mode (same as calendar) */}
          {isEditing && onDelete && (
            <button
              onClick={() => {
                onClose();
                onDelete(editingTask!.id);
              }}
              className="mt-1 w-full rounded-full border border-red-500/20 py-2.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/5"
            >
              {t("tasks.deleteTask")}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main TaskView ──────────────────────────────────────────

export function TaskView() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    Promise.all([getTasks(), getUserCourses()]).then(([t, c]) => {
      setTasks(t);
      setCourses(c);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((t) => t.status === "pending").length,
      done: tasks.filter((t) => t.status === "completed").length,
    }),
    [tasks]
  );

  const filtered = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => t.status === "pending");
    if (filter === "done") return tasks.filter((t) => t.status === "completed");
    return tasks;
  }, [tasks, filter]);

  // Sort: pending first (high > medium > low, then by due date), completed at bottom
  const sorted = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [filtered]);

  const handleToggle = useCallback(async (id: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: completed ? "completed" : "pending", completedAt: completed ? new Date().toISOString() : undefined }
          : t
      )
    );
    await toggleTaskComplete(id, completed);
  }, []);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed } : s)) }
          : t
      )
    );
    await toggleSubtaskComplete(taskId, subtaskId, completed);
  }, []);

  const handleSave = useCallback(
    async (data: Parameters<typeof addTask>[0] & { subtasks: { id: string; title: string; completed: boolean }[] }) => {
      const isEditing = !!editingTask;

      if (isEditing) {
        setTasks((prev) =>
          prev.map((t_) =>
            t_.id === data.id
              ? {
                  ...t_,
                  title: data.title,
                  description: data.description,
                  dueDate: data.dueDate,
                  courseId: data.courseId,
                  priority: data.priority as Task["priority"],
                  subtasks: data.subtasks,
                  reminder: data.reminder as Task["reminder"],
                  notify: data.notify,
                }
              : t_
          )
        );
        await updateTask(data.id, data);
      } else {
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          courseId: data.courseId,
          priority: data.priority as Task["priority"],
          status: "pending",
          subtasks: data.subtasks,
          reminder: data.reminder as Task["reminder"],
          notify: data.notify,
          displayOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTasks((prev) => [newTask, ...prev]);
        await addTask(data);
      }

      setShowForm(false);
      setEditingTask(null);
    },
    [editingTask]
  );

  const handleDelete = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTask(id);
  }, []);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3 px-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-gray-900/5 p-4 dark:border-white/5">
            <div className="mx-auto h-4 w-48 rounded-full bg-gray-900/10 dark:bg-white/10" />
            <div className="mx-auto mt-3 h-3 w-32 rounded-full bg-gray-900/5 dark:bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      {/* Header: filter + add button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      >
        <FilterTabs filter={filter} onFilter={setFilter} counts={counts} />
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="rounded-full bg-[#5227FF] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("tasks.addTask")}
        </button>
      </motion.div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col items-center justify-center py-20"
        >
          <p className="text-sm font-medium text-gray-900/40 dark:text-white/40">
            {t("tasks.noTasks")}
          </p>
          <p className="mt-1 text-xs text-gray-900/25 dark:text-white/25">
            {t("tasks.noTasksDescription")}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sorted.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                courses={courses}
                onToggle={handleToggle}
                onToggleSubtask={handleToggleSubtask}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <TaskFormModal
            editingTask={editingTask}
            courses={courses}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
