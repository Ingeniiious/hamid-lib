"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarBlank,
  Clock,
  MapPin,
  User,
  Trash,
  PencilSimple,
  ArrowLeft,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/admin/DataTable";
import { DestructiveConfirmDialog } from "@/components/admin/DestructiveConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  type SeriesDetail,
  updateCalendarSeries,
  deleteCalendarEvent,
  deleteCalendarSeries,
} from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const categoryColors: Record<string, string> = {
  class: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  exam: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  deadline:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  reminder:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
};

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface SeriesDetailClientProps {
  detail: SeriesDetail;
}

export function SeriesDetailClient({ detail }: SeriesDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(detail.title);
  const [editStartTime, setEditStartTime] = useState(detail.startTime);
  const [editEndTime, setEditEndTime] = useState(detail.endTime);
  const [editCategory, setEditCategory] = useState(detail.category);
  const [editNote, setEditNote] = useState(detail.note || "");

  // Delete dialogs
  const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      await updateCalendarSeries(detail.groupId, {
        title: editTitle,
        startTime: editStartTime,
        endTime: editEndTime,
        category: editCategory,
        note: editNote || null,
      });
      setEditOpen(false);
      router.refresh();
    });
  };

  const handleDeleteSeries = () => {
    startTransition(async () => {
      await deleteCalendarSeries(detail.groupId);
      router.push("/admin/calendar");
    });
  };

  const handleDeleteEvent = () => {
    if (!deleteEventId) return;
    startTransition(async () => {
      await deleteCalendarEvent(deleteEventId);
      setDeleteEventId(null);
      router.refresh();
    });
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (item: SeriesDetail["events"][number]) => (
        <span className="text-sm font-medium">{formatDate(item.date)}</span>
      ),
    },
    {
      key: "startTime",
      header: "Start",
      render: (item: SeriesDetail["events"][number]) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {item.startTime}
        </span>
      ),
    },
    {
      key: "endTime",
      header: "End",
      render: (item: SeriesDetail["events"][number]) => (
        <span className="text-sm text-gray-900/70 dark:text-white/70">
          {item.endTime}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: SeriesDetail["events"][number]) => (
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteEventId(item.id);
              setDeleteEventOpen(true);
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
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Back + Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/calendar")}
            className="rounded-full p-2 text-gray-900/50 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-light text-gray-900 dark:text-white">
              {detail.title}
            </h1>
            <p className="mt-0.5 text-sm text-gray-900/50 dark:text-white/50">
              {detail.isSeries
                ? `${detail.events.length} occurrences`
                : "Single event"}{" "}
              &middot;{" "}
              {detail.recurrence !== "none"
                ? detail.recurrence
                : "One-time"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="rounded-full border-gray-900/10 dark:border-white/15"
          >
            <PencilSimple size={16} weight="duotone" className="mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteSeriesOpen(true)}
            className="rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10 dark:border-red-500/30 dark:text-red-400"
          >
            <Trash size={16} weight="duotone" className="mr-1.5" />
            {detail.isSeries ? "Delete Series" : "Delete"}
          </Button>
        </div>
      </motion.div>

      {/* Info cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <InfoCard
          icon={<User size={18} weight="duotone" />}
          label="User"
          value={detail.userName}
          sub={detail.userEmail}
        />
        <InfoCard
          icon={<Clock size={18} weight="duotone" />}
          label="Schedule"
          value={`${detail.startTime} – ${detail.endTime}`}
        />
        <InfoCard
          icon={<CalendarBlank size={18} weight="duotone" />}
          label="Category"
          value={
            <Badge
              variant="outline"
              className={
                categoryColors[detail.category] ||
                "border-gray-900/10 dark:border-white/15"
              }
            >
              {detail.category.charAt(0).toUpperCase() +
                detail.category.slice(1)}
            </Badge>
          }
        />
        <InfoCard
          icon={<MapPin size={18} weight="duotone" />}
          label="Location"
          value={
            detail.locationType === "online"
              ? "Online"
              : detail.campus && detail.room
                ? `${detail.campus} — ${detail.room}`
                : detail.campus || detail.room || "Not specified"
          }
          sub={
            detail.url ? (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <LinkIcon size={12} />
                Link
              </span>
            ) : undefined
          }
        />
      </motion.div>

      {/* Note */}
      {detail.note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.2 }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <p className="text-xs font-medium text-gray-900/50 dark:text-white/50">
            Note
          </p>
          <p className="mt-1 text-sm text-gray-900/80 dark:text-white/80">
            {detail.note}
          </p>
        </motion.div>
      )}

      {/* Events table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.3 }}
      >
        <h2 className="mb-3 text-sm font-medium text-gray-900/60 dark:text-white/60">
          {detail.isSeries ? "All Occurrences" : "Event"}
        </h2>
        <DataTable
          columns={columns}
          data={detail.events}
          page={1}
          totalPages={1}
          onPageChange={() => {}}
          emptyMessage="No events found."
        />
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              Edit {detail.isSeries ? "Series" : "Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                  End Time
                </label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Category
              </label>
              <div className="flex gap-1">
                {["class", "exam", "deadline", "reminder"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditCategory(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      editCategory === c
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "bg-gray-900/5 text-gray-900/60 hover:text-gray-900 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-900/50 dark:text-white/50">
                Note
              </label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note..."
                className="border-gray-900/10 bg-white/50 dark:border-white/15 dark:bg-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !editTitle.trim()}
              className="rounded-full"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Series Dialog (OTP) */}
      <DestructiveConfirmDialog
        open={deleteSeriesOpen}
        onOpenChange={setDeleteSeriesOpen}
        title={
          detail.isSeries
            ? `Delete Entire Series (${detail.events.length} Events)`
            : "Delete Event"
        }
        description={
          detail.isSeries
            ? `This will permanently delete all ${detail.events.length} occurrences of "${detail.title}". This cannot be undone.`
            : `This will permanently delete "${detail.title}". This cannot be undone.`
        }
        onConfirmed={handleDeleteSeries}
      />

      {/* Delete Single Event Dialog (OTP) */}
      <DestructiveConfirmDialog
        open={deleteEventOpen}
        onOpenChange={(open) => {
          setDeleteEventOpen(open);
          if (!open) setDeleteEventId(null);
        }}
        title="Delete Single Occurrence"
        description="This will permanently delete this single event occurrence from the series. This cannot be undone."
        onConfirmed={handleDeleteEvent}
      />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
      <div className="flex items-center gap-2 text-gray-900/40 dark:text-white/40">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-900/40 dark:text-white/40">
          {sub}
        </p>
      )}
    </div>
  );
}
