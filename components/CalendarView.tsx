"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  isToday,
  isSameDay,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  getHours,
  getMinutes,
  parseISO,
  addMonths,
} from "date-fns";
import { OptionPicker } from "@/components/OptionPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import {
  getCalendarEvents,
  addCalendarEvents,
  deleteCalendarEvent,
  deleteSeriesFromDate,
  toggleEventNotify,
  updateCalendarEvent,
  updateSeriesFromDate,
  updateAllInSeries,
} from "@/app/(main)/dashboard/me/calendar/actions";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/* ── Types ───────────────────────────────────────────────── */

type EventCategory = "class" | "exam" | "deadline" | "reminder";
type LocationType = "in-person" | "online";
type Recurrence = "none" | "weekly" | "biweekly" | "monthly";

// Alert minutes before event (negative = none)
type AlertMinutes = -1 | 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 | 2880;

interface CalendarAlert {
  minutes: AlertMinutes;
  travelMinutes?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: EventCategory;
  note?: string;
  // Location — only for class & exam
  locationType?: LocationType;
  campus?: string;
  room?: string;
  url?: string;
  // Alerts — up to 2
  alerts?: CalendarAlert[];
  // Notifications
  notify: boolean;
  // Recurrence
  recurrence?: Recurrence;
  seriesId?: string; // groups recurring events together
}

const HAS_LOCATION: EventCategory[] = ["class", "exam"];

const ALERT_VALUES: { value: AlertMinutes; key: string }[] = [
  { value: -1, key: "calendar.alertNone" },
  { value: 0, key: "calendar.alertAtTime" },
  { value: 5, key: "calendar.alertFiveMin" },
  { value: 10, key: "calendar.alertTenMin" },
  { value: 15, key: "calendar.alertFifteenMin" },
  { value: 30, key: "calendar.alertThirtyMin" },
  { value: 60, key: "calendar.alertOneHour" },
  { value: 120, key: "calendar.alertTwoHours" },
  { value: 1440, key: "calendar.alertOneDay" },
  { value: 2880, key: "calendar.alertTwoDays" },
];

const TRAVEL_VALUES: { value: number; key: string }[] = [
  { value: 0, key: "calendar.travelNone" },
  { value: 5, key: "calendar.travelFiveMin" },
  { value: 10, key: "calendar.travelTenMin" },
  { value: 15, key: "calendar.travelFifteenMin" },
  { value: 20, key: "calendar.travelTwentyMin" },
  { value: 30, key: "calendar.travelThirtyMin" },
  { value: 45, key: "calendar.travelFortyFiveMin" },
  { value: 60, key: "calendar.travelOneHour" },
  { value: 90, key: "calendar.travelNinetyMin" },
  { value: 120, key: "calendar.travelTwoHours" },
];

const RECURRENCE_VALUES: { value: Recurrence; key: string }[] = [
  { value: "none", key: "calendar.doesNotRepeat" },
  { value: "weekly", key: "calendar.everyWeek" },
  { value: "biweekly", key: "calendar.everyTwoWeeks" },
  { value: "monthly", key: "calendar.everyMonth" },
];

/* ── Constants ───────────────────────────────────────────── */

const START_HOUR = 6;
const END_HOUR = 24; // show up to 12 AM like Apple
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);
const HOUR_HEIGHT = 60;
const CATEGORY_CONFIG: Record<
  EventCategory,
  { bg: string; accent: string; text: string; dot: string }
> = {
  class: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    accent: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  exam: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    accent: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  deadline: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    accent: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  reminder: {
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    accent: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
};

/* ── Helpers ──────────────────────────────────────────────── */

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function formatHour(hour: number, t: (key: string) => string): string {
  if (hour === 0 || hour === 24) return t("calendar.midnight");
  if (hour === 12) return t("calendar.noon");
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? t("calendar.am") : t("calendar.pm");
  return `${h} ${suffix}`;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/* ── Component ───────────────────────────────────────────── */

export function CalendarView() {
  const { t } = useTranslation();
  const alertOptions = useMemo(() => ALERT_VALUES.map((a) => ({ value: a.value, label: t(a.key) })), [t]);
  const travelOptions = useMemo(() => TRAVEL_VALUES.map((a) => ({ value: a.value, label: t(a.key) })), [t]);
  const recurrenceOptions = useMemo(() => RECURRENCE_VALUES.map((a) => ({ value: a.value, label: t(a.key) })), [t]);

  const [isDesktop, setIsDesktop] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<EventCategory>("class");
  const [formNote, setFormNote] = useState("");
  const [formLocationType, setFormLocationType] = useState<LocationType>("in-person");
  const [formCampus, setFormCampus] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formUrl, setFormUrl] = useState("");
  // Alerts — multi-select from single dropdown
  const [formAlerts, setFormAlerts] = useState<AlertMinutes[]>([15, 60]);
  const [formTravelTime, setFormTravelTime] = useState(0);
  const [alertPickerOpen, setAlertPickerOpen] = useState(false);
  // Recurrence
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("none");
  // Notifications
  const [formNotify, setFormNotify] = useState(true);
  const [notifPromptTrigger, setNotifPromptTrigger] = useState(0);
  // Edit mode
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  // Delete confirmation for recurring events
  const [deleteConfirm, setDeleteConfirm] = useState<CalendarEvent | null>(null);
  // Edit scope confirmation for recurring events
  const [editScopeConfirm, setEditScopeConfirm] = useState<{
    event: CalendarEvent;
    updated: CalendarEvent;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCalendarEvents()
      .then((events) => {
        setEvents(events as CalendarEvent[]);
      })
      .catch(() => {
        // Failed to load — start with empty
      })
      .finally(() => setMounted(true));
  }, []);

  // Scroll to current hour on mount
  useEffect(() => {
    if (mounted && scrollRef.current) {
      const h = getHours(new Date());
      const target = Math.max(0, (h - START_HOUR - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = target;
    }
  }, [mounted]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Responsive
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Computed ─────────────────────────────────────────── */

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Desktop: 7 day columns, Mobile: single day (selectedDay)
  const timelineDays = useMemo(
    () => (isDesktop ? weekDays : [selectedDay]),
    [isDesktop, weekDays, selectedDay]
  );

  const getEventsForDay = useCallback(
    (date: Date) => {
      const key = dateKey(date);
      return events.filter((e) => e.date === key);
    },
    [events]
  );

  const nowMinutes = getHours(now) * 60 + getMinutes(now);
  const nowPx = minutesToPx(nowMinutes);
  const showNowLine =
    nowMinutes >= START_HOUR * 60 &&
    nowMinutes <= END_HOUR * 60 &&
    timelineDays.some((d) => isToday(d));

  // Smart "Today" button: subtle when viewing today, accent when browsing away
  const isViewingToday = isDesktop
    ? weekDays.some((d) => isToday(d))
    : isToday(selectedDay);

  /* ── Navigation ──────────────────────────────────────── */

  const goPrev = () => {
    setCurrentDate((d) => subWeeks(d, 1));
    setSelectedDay((d) => subWeeks(d, 1));
  };

  const goNext = () => {
    setCurrentDate((d) => addWeeks(d, 1));
    setSelectedDay((d) => addWeeks(d, 1));
  };

  const goToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDay(t);
  };

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    setCurrentDate(day);
  };

  /* ── Event CRUD ──────────────────────────────────────── */

  const openForm = (date: Date, hour?: number) => {
    setEditingEvent(null);
    setFormDate(dateKey(date));
    const h = hour ?? 9;
    setFormStartTime(`${String(h).padStart(2, "0")}:00`);
    setFormEndTime(`${String(Math.min(h + 1, 23)).padStart(2, "0")}:00`);
    setFormTitle("");
    setFormCategory("class");
    setFormNote("");
    setFormLocationType("in-person");
    setFormCampus("");
    setFormRoom("");
    setFormUrl("");
    setFormAlerts([15, 60]);
    setFormTravelTime(0);
    setAlertPickerOpen(false);
    setFormRecurrence("none");
    setFormNotify(true);
    setShowForm(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormDate(event.date);
    setFormStartTime(event.startTime);
    setFormEndTime(event.endTime);
    setFormTitle(event.title);
    setFormCategory(event.category);
    setFormNote(event.note || "");
    setFormLocationType(event.locationType || "in-person");
    setFormCampus(event.campus || "");
    setFormRoom(event.room || "");
    setFormUrl(event.url || "");
    setFormAlerts(
      event.alerts && event.alerts.length > 0
        ? event.alerts.map((a) => a.minutes)
        : []
    );
    setFormTravelTime(
      event.alerts?.[0]?.travelMinutes || 0
    );
    setAlertPickerOpen(false);
    setFormRecurrence(event.recurrence || "none");
    setFormNotify(event.notify);
    setShowForm(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const handleAddEvent = () => {
    if (!formTitle.trim()) return;
    const hasLoc = HAS_LOCATION.includes(formCategory);

    // Build alerts array from multi-select
    const travelMin = formTravelTime || undefined;
    const alerts: CalendarAlert[] = formAlerts
      .filter((m) => m !== -1)
      .map((minutes) => ({ minutes, travelMinutes: travelMin }));

    const seriesId = formRecurrence !== "none"
      ? Date.now().toString(36) + "s" + Math.random().toString(36).slice(2, 6)
      : undefined;

    // Generate dates: base + recurring occurrences
    const baseDateObj = parseISO(formDate);
    const dates: string[] = [formDate];

    if (formRecurrence === "weekly") {
      for (let i = 1; i <= 15; i++) dates.push(dateKey(addDays(baseDateObj, i * 7)));
    } else if (formRecurrence === "biweekly") {
      for (let i = 1; i <= 8; i++) dates.push(dateKey(addDays(baseDateObj, i * 14)));
    } else if (formRecurrence === "monthly") {
      for (let i = 1; i <= 5; i++) dates.push(dateKey(addMonths(baseDateObj, i)));
    }

    const newEvents: CalendarEvent[] = dates.map((d) => ({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: formTitle.trim(),
      date: d,
      startTime: formStartTime,
      endTime: formEndTime,
      category: formCategory,
      note: formNote.trim() || undefined,
      locationType: hasLoc ? formLocationType : undefined,
      campus: hasLoc && formLocationType === "in-person" ? formCampus.trim() || undefined : undefined,
      room: hasLoc && formLocationType === "in-person" ? formRoom.trim() || undefined : undefined,
      url: hasLoc && formLocationType === "online" ? formUrl.trim() || undefined : undefined,
      alerts: alerts.length > 0 ? alerts : undefined,
      notify: formNotify,
      recurrence: formRecurrence !== "none" ? formRecurrence : undefined,
      seriesId,
    }));

    setEvents((prev) => [...prev, ...newEvents]);
    setShowForm(false);

    // Prompt to enable push notifications if creating events with alerts
    if (alerts.length > 0 && formNotify) {
      setNotifPromptTrigger((n) => n + 1);
    }

    addCalendarEvents(newEvents).catch(() => {
      // Rollback on failure — remove the optimistically added events
      const newIds = new Set(newEvents.map((e) => e.id));
      setEvents((prev) => prev.filter((e) => !newIds.has(e.id)));
    });
  };

  const buildUpdatedEvent = (): CalendarEvent | null => {
    if (!editingEvent || !formTitle.trim()) return null;
    const hasLoc = HAS_LOCATION.includes(formCategory);
    const travelMin = formTravelTime || undefined;
    const alerts: CalendarAlert[] = formAlerts
      .filter((m) => m !== -1)
      .map((minutes) => ({ minutes, travelMinutes: travelMin }));

    return {
      ...editingEvent,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      category: formCategory,
      note: formNote.trim() || undefined,
      locationType: hasLoc ? formLocationType : undefined,
      campus: hasLoc && formLocationType === "in-person" ? formCampus.trim() || undefined : undefined,
      room: hasLoc && formLocationType === "in-person" ? formRoom.trim() || undefined : undefined,
      url: hasLoc && formLocationType === "online" ? formUrl.trim() || undefined : undefined,
      alerts: alerts.length > 0 ? alerts : undefined,
      notify: formNotify,
    };
  };

  const handleSaveEvent = () => {
    const updated = buildUpdatedEvent();
    if (!updated || !editingEvent) return;

    // If recurring, show scope dialog
    if (editingEvent.seriesId) {
      setShowForm(false);
      setEditScopeConfirm({ event: editingEvent, updated });
      return;
    }

    // Non-recurring: save directly
    applyEditThisOnly(editingEvent, updated);
    setShowForm(false);
    setEditingEvent(null);
  };

  const getSeriesUpdateData = (updated: CalendarEvent) => ({
    title: updated.title,
    startTime: updated.startTime,
    endTime: updated.endTime,
    category: updated.category,
    note: updated.note,
    locationType: updated.locationType,
    campus: updated.campus,
    room: updated.room,
    url: updated.url,
    alerts: updated.alerts,
    notify: updated.notify,
  });

  const applyEditThisOnly = (original: CalendarEvent, updated: CalendarEvent) => {
    const backup = events;
    setEvents((prev) =>
      prev.map((e) => (e.id === original.id ? updated : e))
    );
    updateCalendarEvent(original.id, {
      title: updated.title,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      category: updated.category,
      note: updated.note,
      locationType: updated.locationType,
      campus: updated.campus,
      room: updated.room,
      url: updated.url,
      alerts: updated.alerts,
      notify: updated.notify,
    }).catch(() => setEvents(backup));
  };

  const handleEditThisOnly = () => {
    if (!editScopeConfirm) return;
    applyEditThisOnly(editScopeConfirm.event, editScopeConfirm.updated);
    setEditScopeConfirm(null);
    setEditingEvent(null);
  };

  const handleEditThisAndFuture = () => {
    if (!editScopeConfirm) return;
    const { event, updated } = editScopeConfirm;
    const data = getSeriesUpdateData(updated);
    const backup = events;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.seriesId === event.seriesId && e.date >= event.date) {
          return { ...e, ...data, date: e.date, id: e.id, seriesId: e.seriesId, recurrence: e.recurrence };
        }
        return e;
      })
    );
    setEditScopeConfirm(null);
    setEditingEvent(null);
    updateSeriesFromDate(event.seriesId!, event.date, data).catch(() => setEvents(backup));
  };

  const handleEditAllEvents = () => {
    if (!editScopeConfirm) return;
    const { event, updated } = editScopeConfirm;
    const data = getSeriesUpdateData(updated);
    const backup = events;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.seriesId === event.seriesId) {
          return { ...e, ...data, date: e.date, id: e.id, seriesId: e.seriesId, recurrence: e.recurrence };
        }
        return e;
      })
    );
    setEditScopeConfirm(null);
    setEditingEvent(null);
    updateAllInSeries(event.seriesId!, data).catch(() => setEvents(backup));
  };

  const handleToggleNotify = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    const newValue = !event.notify;
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, notify: newValue } : e))
    );
    toggleEventNotify(id, newValue).catch(() => {
      // Rollback
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, notify: !newValue } : e))
      );
    });
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    // If part of a series, show confirmation dialog
    if (event.seriesId) {
      setDeleteConfirm(event);
      return;
    }

    // Non-recurring: delete immediately
    const backup = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    deleteCalendarEvent(id).catch(() => setEvents(backup));
  };

  const handleDeleteThisOnly = () => {
    if (!deleteConfirm) return;
    const backup = events;
    const id = deleteConfirm.id;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeleteConfirm(null);
    deleteCalendarEvent(id).catch(() => setEvents(backup));
  };

  const handleDeleteThisAndFuture = () => {
    if (!deleteConfirm) return;
    const backup = events;
    const { seriesId, date } = deleteConfirm;
    setEvents((prev) =>
      prev.filter((e) => !(e.seriesId === seriesId && e.date >= date))
    );
    setDeleteConfirm(null);
    deleteSeriesFromDate(seriesId!, date).catch(() => setEvents(backup));
  };

  /* ── Render ──────────────────────────────────────────── */

  if (!mounted) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="h-10 w-full animate-pulse rounded-xl bg-gray-900/5 dark:bg-white/5" />
        <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
      </div>
    );
  }

  const gridCols = isDesktop
    ? "grid-cols-[48px_repeat(7,minmax(0,1fr))]"
    : "grid-cols-[44px_minmax(0,1fr)]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="flex h-full flex-col"
    >
      {/* ── Mobile: Week strip + date label ──────────────── */}
      {!isDesktop && (
        <div className="shrink-0">
          {/* Nav row */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrev}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {format(weekStart, "MMMM yyyy")}
              </span>
              <button
                onClick={goNext}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={goToday}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                  isViewingToday
                    ? "bg-gray-900/5 text-gray-600 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
                    : "bg-[#5227FF] text-white hover:opacity-90"
                }`}
              >
                {t("calendar.today")}
              </button>
              <button
                onClick={() => openForm(selectedDay)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>
          </div>

          {/* Week strip */}
          <div className="grid grid-cols-7 gap-0.5 pb-2">
            {weekDays.map((day) => {
              const selected = isSameDay(day, selectedDay);
              const today = isToday(day);
              return (
                <button
                  key={dateKey(day)}
                  onClick={() => selectDay(day)}
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors duration-150"
                >
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${today ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-white/30"}`}>
                    {format(day, "EEEEE")}
                  </span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-200 ${
                      selected && today
                        ? "bg-red-500 font-semibold text-white"
                        : selected
                          ? "bg-gray-900 font-semibold text-white dark:bg-white dark:text-gray-900"
                          : today
                            ? "font-semibold text-red-500 dark:text-red-400"
                            : "text-gray-700 dark:text-white/70"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected date label */}
          <div className="pb-2">
            <motion.p
              key={dateKey(selectedDay)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease }}
              className="text-center text-xs font-medium text-gray-500 dark:text-white/40"
            >
              {format(selectedDay, "EEEE – MMM d, yyyy")}
            </motion.p>
          </div>
        </div>
      )}

      {/* ── Desktop: Toolbar ─────────────────────────────── */}
      {isDesktop && (
        <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/5 text-gray-600 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <motion.span
              key={weekStart.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease }}
              className="min-w-[200px] text-center text-sm font-medium text-gray-900 dark:text-white"
            >
              {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </motion.span>
            <button
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/5 text-gray-600 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                isViewingToday
                  ? "bg-gray-900/5 text-gray-600 hover:bg-gray-900/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
                  : "bg-[#5227FF] text-white hover:opacity-90"
              }`}
            >
              {t("calendar.today")}
            </button>
            <button
              onClick={() => openForm(selectedDay)}
              className="rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
            >
              {t("calendar.addEvent")}
            </button>
          </div>
        </div>
      )}

      {/* ── Notification Prompt ──────────────────────────── */}
      <div className="mb-2">
        <NotificationPrompt context="calendar" trigger={notifPromptTrigger} />
      </div>

      {/* ── Timeline ─────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl md:rounded-2xl dark:border-white/15 dark:bg-white/5">
        {/* Desktop day headers */}
        {isDesktop && (
          <div className={`grid shrink-0 ${gridCols} border-b border-gray-900/10 dark:border-white/10`}>
            <div className="border-r border-gray-900/5 dark:border-white/5" />
            {timelineDays.map((day) => (
              <div
                key={dateKey(day)}
                className={`border-r border-gray-900/5 px-1 py-3 text-center last:border-r-0 dark:border-white/5 ${
                  isToday(day) ? "bg-gray-900/[0.03] dark:bg-white/[0.03]" : ""
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-white/30">
                  {format(day, "EEE")}
                </p>
                <p className={`mt-0.5 text-lg font-light ${isToday(day) ? "font-medium text-gray-900 dark:text-white" : "text-gray-600 dark:text-white/60"}`}>
                  {format(day, "d")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Scrollable hourly grid */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={`grid ${gridCols} relative`}
            style={{ height: HOURS.length * HOUR_HEIGHT }}
          >
            {/* Time gutter */}
            <div className="relative border-r border-gray-900/5 dark:border-white/5">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-gray-400 dark:text-white/30"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                >
                  {formatHour(hour, t)}
                </div>
              ))}

              {/* Current time pill — replaces the hour label at this position */}
              {showNowLine && (
                <div
                  className="absolute right-0 z-30 flex -translate-y-1/2 items-center"
                  style={{ top: nowPx, left: 0 }}
                >
                  <div className="flex-1" />
                  <div className="rounded-full bg-red-500 px-1.5 py-[1px] text-[10px] font-semibold leading-tight text-white">
                    {format(now, "h:mm")}
                  </div>
                </div>
              )}
            </div>

            {/* Day columns */}
            {timelineDays.map((day) => {
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={dateKey(day)}
                  className={`relative border-r border-gray-900/5 last:border-r-0 dark:border-white/5 ${
                    isToday(day) && isDesktop ? "bg-gray-900/[0.02] dark:bg-white/[0.02]" : ""
                  }`}
                >
                  {/* Hour grid lines + clickable cells */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-gray-900/[0.06] transition-colors duration-150 hover:bg-gray-900/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
                      style={{
                        top: (hour - START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                      onClick={() => openForm(day, hour)}
                    />
                  ))}

                  {/* Events — Apple-style with left accent border */}
                  {dayEvents.map((event) => {
                    const startMin = timeToMinutes(event.startTime);
                    const endMin = timeToMinutes(event.endTime);
                    const top = minutesToPx(startMin);
                    const height = Math.max(
                      ((endMin - startMin) / 60) * HOUR_HEIGHT,
                      28
                    );
                    const config = CATEGORY_CONFIG[event.category];

                    return (
                      <div
                        key={event.id}
                        className={`group absolute z-10 flex overflow-hidden rounded-lg ${config.bg} cursor-pointer`}
                        style={{ top: top + 1, height: height - 2, left: 3, right: 3 }}
                        onClick={() => openEditForm(event)}
                        title={`${event.title}\n${event.startTime} — ${event.endTime}${event.locationType === "in-person" ? `\n${[event.campus, event.room].filter(Boolean).join(" · ") || t("calendar.inPerson")}` : event.locationType === "online" ? `\n${event.url || t("calendar.online")}` : ""}${event.note ? "\n" + event.note : ""}`}
                      >
                        {/* Left accent bar */}
                        <div className={`w-[3px] shrink-0 rounded-l-lg ${config.accent}`} />

                        {/* Content */}
                        <div className={`flex min-w-0 flex-1 flex-col px-2 py-1 ${config.text}`}>
                          <p className="truncate text-[11px] font-semibold leading-tight">
                            {event.title}
                          </p>
                          {height > 40 && (
                            <p className="mt-0.5 truncate text-[10px] opacity-70">
                              {event.startTime} — {event.endTime}
                              {event.locationType === "in-person" && event.room ? ` · ${event.room}` : ""}
                            </p>
                          )}
                          {height > 60 && (event.campus || event.url || event.note) && (
                            <p className="mt-0.5 truncate text-[10px] opacity-50">
                              {event.locationType === "in-person" && event.campus
                                ? event.campus
                                : event.locationType === "online"
                                  ? t("calendar.online")
                                  : ""}
                              {event.note ? (event.campus || event.url ? ` · ${event.note}` : event.note) : ""}
                            </p>
                          )}
                        </div>

                        {/* Actions — hover only, desktop */}
                        <div className="hidden shrink-0 flex-col items-center justify-center gap-0.5 px-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 md:flex">
                          {/* Notify toggle */}
                          {event.alerts && event.alerts.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleNotify(event.id);
                              }}
                              title={event.notify ? "Notifications on" : "Notifications off"}
                              className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              {event.notify ? (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 hover:opacity-80"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-25 hover:opacity-50"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                              )}
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 hover:opacity-70"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                </div>
              );
            })}

            {/* Current time line — spans full width across all day columns */}
            {showNowLine && (
              <div
                className="pointer-events-none absolute right-0 z-20"
                style={{ top: nowPx, left: isDesktop ? 48 : 44 }}
              >
                <div className="h-[2px] w-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Event Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop — simple overlay, no blur for performance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => { setShowForm(false); setEditingEvent(null); }}
            />

            {/* Card — always centered, works with mobile keyboard */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85vh] max-w-md -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-900/10 bg-white p-5 shadow-xl dark:border-white/15 dark:bg-[var(--background)]"
            >
              <h3 className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
                {editingEvent ? t("calendar.editEvent") : t("calendar.newEvent")}
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <p className="mt-0.5 cursor-pointer text-center text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60">
                    {formDate && format(parseISO(formDate), "EEEE, MMMM d, yyyy")}
                  </p>
                </PopoverTrigger>
                {editingEvent && (
                  <PopoverContent className="w-auto p-0" align="center">
                    <DatePicker
                      mode="single"
                      selected={formDate ? parseISO(formDate) : undefined}
                      onSelect={(date) => {
                        if (date) setFormDate(format(date, "yyyy-MM-dd"));
                      }}
                      defaultMonth={formDate ? parseISO(formDate) : undefined}
                    />
                  </PopoverContent>
                )}
              </Popover>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  ref={titleRef}
                  type="text"
                  placeholder={t("calendar.titlePlaceholder")}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (editingEvent ? handleSaveEvent() : handleAddEvent())}
                  className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                />

                <div className="flex flex-wrap justify-center gap-1.5">
                  {(
                    Object.entries(CATEGORY_CONFIG) as [
                      EventCategory,
                      (typeof CATEGORY_CONFIG)[EventCategory],
                    ][]
                  ).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFormCategory(key)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        formCategory === key
                          ? `${config.bg} ${config.text} ring-1 ring-current/20`
                          : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                      {t(`calendar.${key}`)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="h-10 flex-1 rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus-visible:ring-white/30"
                  />
                  <span className="text-xs text-gray-900/40 dark:text-white/50">{t("calendar.timeTo")}</span>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="h-10 flex-1 rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus-visible:ring-white/30"
                  />
                </div>

                {/* Location — only for Class & Exam */}
                {HAS_LOCATION.includes(formCategory) && (
                  <div className="flex flex-col gap-2.5 rounded-2xl border border-gray-900/10 bg-gray-900/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    {/* In Person / Online toggle */}
                    <div className="flex gap-1 rounded-full bg-gray-900/5 p-0.5 dark:bg-white/10">
                      {(["in-person", "online"] as LocationType[]).map((lt) => (
                        <button
                          key={lt}
                          onClick={() => setFormLocationType(lt)}
                          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                            formLocationType === lt
                              ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white"
                              : "text-gray-900/50 hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/60"
                          }`}
                        >
                          {lt === "in-person" ? t("calendar.inPerson") : t("calendar.online")}
                        </button>
                      ))}
                    </div>

                    {formLocationType === "in-person" ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t("calendar.campusPlaceholder")}
                          value={formCampus}
                          onChange={(e) => setFormCampus(e.target.value)}
                          className="h-10 min-w-0 flex-1 rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                        />
                        <input
                          type="text"
                          placeholder={t("calendar.roomPlaceholder")}
                          value={formRoom}
                          onChange={(e) => setFormRoom(e.target.value)}
                          className="h-10 w-28 rounded-full border border-gray-900/15 bg-gray-900/5 px-4 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                        />
                      </div>
                    ) : (
                      <input
                        type="url"
                        placeholder={t("calendar.meetingLinkPlaceholder")}
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                      />
                    )}
                  </div>
                )}

                {/* Alerts — single multi-select dropdown */}
                <Popover open={alertPickerOpen} onOpenChange={setAlertPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative flex h-10 w-full items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
                    >
                      <span className={formAlerts.length > 0 ? "truncate text-gray-900 dark:text-white" : "text-gray-900/40 dark:text-white/50"}>
                        {formAlerts.length === 0
                          ? t("calendar.noAlerts")
                          : formAlerts
                              .map((v) => alertOptions.find((o) => o.value === v)?.label)
                              .filter(Boolean)
                              .join(", ")}
                      </span>
                      <CaretUpDown
                        size={16}
                        weight="duotone"
                        className="absolute right-4 text-gray-900/30 dark:text-white/40"
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="!w-[--radix-popover-trigger-width] rounded-xl border-gray-900/15 bg-white/90 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-[var(--background)]/95 dark:backdrop-blur-xl"
                    sideOffset={4}
                  >
                    <div className="max-h-[200px] overflow-y-auto">
                      {alertOptions.filter((o) => o.value !== -1).map((opt) => {
                        const isSelected = formAlerts.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormAlerts((prev) =>
                                isSelected
                                  ? prev.filter((v) => v !== opt.value)
                                  : [...prev, opt.value]
                              );
                            }}
                            className={`relative flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white ${
                              isSelected
                                ? "font-medium text-gray-900 dark:text-white"
                                : "text-gray-900/70 dark:text-white/70"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                size={12}
                                weight="bold"
                                className="absolute left-3 text-gray-900 dark:text-white"
                              />
                            )}
                            {opt.label}
                          </button>
                        );
                      })}
                      {/* Clear all option */}
                      {formAlerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormAlerts([])}
                          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900/60 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/60"
                        >
                          {t("calendar.clearAll")}
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Notify toggle — only when alerts exist */}
                {formAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormNotify((v) => !v)}
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                      formNotify
                        ? "border-[#5227FF]/20 bg-[#5227FF]/5 text-[#5227FF] dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10 dark:text-[#8B6FFF]"
                        : "border-gray-900/15 bg-gray-900/5 text-gray-900/40 dark:border-white/20 dark:bg-white/10 dark:text-white/40"
                    }`}
                  >
                    {formNotify ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    )}
                    {formNotify ? t("calendar.notifyOn") : t("calendar.notifyOff")}
                  </button>
                )}

                {/* Travel time — only when alerts exist + in-person location */}
                {formAlerts.length > 0 && HAS_LOCATION.includes(formCategory) && formLocationType === "in-person" && (
                  <OptionPicker options={travelOptions} value={formTravelTime} onChange={setFormTravelTime} size="sm" />
                )}

                {/* Recurrence — only for new events */}
                {!editingEvent && (
                  <OptionPicker
                    options={recurrenceOptions}
                    value={formRecurrence}
                    onChange={(v) => setFormRecurrence(v as Recurrence)}
                    placeholder={t("calendar.repeatPlaceholder")}
                  />
                )}

                <input
                  type="text"
                  placeholder={t("calendar.notePlaceholder")}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (editingEvent ? handleSaveEvent() : handleAddEvent())}
                  className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                />

                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => { setShowForm(false); setEditingEvent(null); }}
                    className="flex-1 rounded-full bg-gray-900/5 py-2.5 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={editingEvent ? handleSaveEvent : handleAddEvent}
                    disabled={!formTitle.trim()}
                    className="flex-1 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-40"
                  >
                    {editingEvent ? t("common.save") : formRecurrence !== "none" ? t("calendar.addSeries") : t("calendar.addEvent")}
                  </button>
                </div>

                {/* Delete button — visible in edit mode (critical for mobile) */}
                {editingEvent && (
                  <button
                    onClick={() => {
                      setShowForm(false);
                      handleDeleteEvent(editingEvent.id);
                      setEditingEvent(null);
                    }}
                    className="mt-1 w-full rounded-full border border-red-500/20 py-2.5 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/5"
                  >
                    {t("calendar.deleteEvent")}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Recurring Event Confirmation ────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-900/10 bg-white shadow-xl dark:border-white/15 dark:bg-[var(--background)]"
            >
              <div className="p-5">
                <h3 className="text-center font-display text-base font-light text-gray-900 dark:text-white">
                  {t("calendar.deleteRecurring")}
                </h3>
                <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-white/50">
                  &ldquo;{deleteConfirm.title}&rdquo; on {deleteConfirm.date}
                </p>
              </div>
              <div className="flex flex-col gap-0 border-t border-gray-900/10 dark:border-white/10">
                <button
                  onClick={handleDeleteThisOnly}
                  className="py-3 text-center text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900/5 dark:text-white dark:hover:bg-white/5"
                >
                  {t("calendar.thisOnly")}
                </button>
                <div className="mx-5 h-px bg-gray-900/10 dark:bg-white/10" />
                <button
                  onClick={handleDeleteThisAndFuture}
                  className="py-3 text-center text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/5"
                >
                  {t("calendar.thisAndFuture")}
                </button>
                <div className="mx-5 h-px bg-gray-900/10 dark:bg-white/10" />
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="py-3 text-center text-sm font-medium text-gray-500 transition-colors hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit Recurring Event Scope ────────────────── */}
      <AnimatePresence>
        {editScopeConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => { setEditScopeConfirm(null); setEditingEvent(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-900/10 bg-white shadow-xl dark:border-white/15 dark:bg-[var(--background)]"
            >
              <div className="p-5">
                <h3 className="text-center font-display text-base font-light text-gray-900 dark:text-white">
                  {t("calendar.editRecurring")}
                </h3>
                <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-white/50">
                  &ldquo;{editScopeConfirm.event.title}&rdquo; on {editScopeConfirm.event.date}
                </p>
              </div>
              <div className="flex flex-col gap-0 border-t border-gray-900/10 dark:border-white/10">
                <button
                  onClick={handleEditThisOnly}
                  className="py-3 text-center text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900/5 dark:text-white dark:hover:bg-white/5"
                >
                  {t("calendar.thisOnly")}
                </button>
                <div className="mx-5 h-px bg-gray-900/10 dark:bg-white/10" />
                <button
                  onClick={handleEditThisAndFuture}
                  className="py-3 text-center text-sm font-medium text-[#5227FF] transition-colors hover:bg-[#5227FF]/5 dark:text-[#8B6FFF] dark:hover:bg-[#5227FF]/10"
                >
                  {t("calendar.thisAndFuture")}
                </button>
                <div className="mx-5 h-px bg-gray-900/10 dark:bg-white/10" />
                <button
                  onClick={handleEditAllEvents}
                  className="py-3 text-center text-sm font-medium text-[#5227FF] transition-colors hover:bg-[#5227FF]/5 dark:text-[#8B6FFF] dark:hover:bg-[#5227FF]/10"
                >
                  {t("calendar.allEvents")}
                </button>
                <div className="mx-5 h-px bg-gray-900/10 dark:bg-white/10" />
                <button
                  onClick={() => { setEditScopeConfirm(null); setEditingEvent(null); }}
                  className="py-3 text-center text-sm font-medium text-gray-500 transition-colors hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
