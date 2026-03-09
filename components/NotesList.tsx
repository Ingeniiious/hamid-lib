"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PAPER_STYLES, PAPER_COLORS } from "@/lib/note-styles";
import { createNote, deleteNote } from "@/app/(main)/dashboard/space/notes/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface NoteItem {
  id: string;
  title: string;
  paperStyle: string;
  paperColor: string;
  font: string;
  updatedAt: Date;
  createdAt: Date;
}

export function NotesList({ notes }: { notes: NoteItem[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const id = await createNote({});
      router.push(`/dashboard/space/notes/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteNote(noteId);
    router.refresh();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      {/* New note button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mb-6"
      >
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-2xl border border-dashed border-gray-900/15 px-6 py-4 text-sm text-gray-900/40 transition-colors hover:border-gray-900/30 hover:text-gray-900/60 disabled:opacity-50 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
        >
          {creating ? "Creating..." : "+ New Note"}
        </button>
      </motion.div>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="py-16 text-center text-sm text-gray-900/30 dark:text-white/30"
        >
          No notes yet. Create your first one.
        </motion.p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {notes.map((note, i) => {
            const paperBg =
              PAPER_STYLES[note.paperStyle as keyof typeof PAPER_STYLES] ||
              PAPER_STYLES.blank;
            const colorObj = PAPER_COLORS.find(
              (c) => c.value === note.paperColor
            );

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.5,
                  ease,
                  delay: Math.min(i * 0.05, 0.3),
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div
                  onClick={() =>
                    router.push(`/dashboard/space/notes/${note.id}`)
                  }
                  className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-gray-900/8 text-left transition-shadow hover:shadow-md dark:border-white/10"
                >
                  {/* Paper preview */}
                  <div
                    className="aspect-[3/4] p-3 sm:p-4"
                    style={{
                      backgroundColor: note.paperColor,
                      backgroundImage: paperBg.background,
                      backgroundSize:
                        "backgroundSize" in paperBg
                          ? paperBg.backgroundSize
                          : undefined,
                    }}
                  >
                    <p className="line-clamp-6 text-xs leading-relaxed text-gray-800/60 sm:text-sm">
                      {note.title === "Untitled" ? "" : note.title}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-gray-900/5 bg-white/80 px-3 py-2 backdrop-blur-sm dark:border-white/5 dark:bg-gray-900/80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                        {note.title}
                      </p>
                      <p className="text-[10px] text-gray-900/40 dark:text-white/40">
                        {formatDate(note.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, note.id)}
                      className="ml-2 rounded-md p-1 text-xs text-gray-900/0 transition-colors group-hover:text-gray-900/30 hover:!text-red-500 dark:text-white/0 dark:group-hover:text-white/30 dark:hover:!text-red-400"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
