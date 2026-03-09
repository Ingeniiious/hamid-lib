"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import NoteFolder from "@/components/NoteFolder";
import { PAPER_STYLES } from "@/lib/note-styles";
import {
  BookOpen,
  GraduationCap,
  Notebook,
  Flask,
  Calculator,
  Atom,
  Globe,
  PencilLine,
  Lightbulb,
  FolderSimple,
  MusicNote,
  Heart,
  Star,
  Code,
  Camera,
  Briefcase,
  House,
  Trophy,
  GameController,
  Palette,
  Compass,
  Brain,
  ChartLine,
  Scales,
  Stethoscope,
  Wrench,
  Leaf,
  Lightning,
  Rocket,
  PuzzlePiece,
  Translate,
  FilmStrip,
  Megaphone,
  ShieldStar,
  Cpu,
} from "@phosphor-icons/react";
import {
  createNote,
  createFolder,
  deleteNote,
  deleteFolder,
  moveNotes,
  moveFolders,
} from "@/app/(main)/dashboard/space/notes/actions";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const ease = EASE as unknown as [number, number, number, number];

// ── Folder config ──────────────────────────────────────

const FOLDER_COLORS = [
  { label: "Purple", value: "#5227FF" },
  { label: "Blue", value: "#2563eb" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#eab308" },
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
] as const;

const FOLDER_ICONS = [
  { label: "None", value: "", icon: null },
  { label: "Folder", value: "folder", icon: FolderSimple },
  { label: "Book", value: "book", icon: BookOpen },
  { label: "Graduation", value: "graduation", icon: GraduationCap },
  { label: "Notebook", value: "notebook", icon: Notebook },
  { label: "Science", value: "flask", icon: Flask },
  { label: "Math", value: "calculator", icon: Calculator },
  { label: "Physics", value: "atom", icon: Atom },
  { label: "Brain", value: "brain", icon: Brain },
  { label: "Language", value: "globe", icon: Globe },
  { label: "Translate", value: "translate", icon: Translate },
  { label: "Writing", value: "pencil", icon: PencilLine },
  { label: "Ideas", value: "lightbulb", icon: Lightbulb },
  { label: "Code", value: "code", icon: Code },
  { label: "CPU", value: "cpu", icon: Cpu },
  { label: "Analytics", value: "chart", icon: ChartLine },
  { label: "Law", value: "scales", icon: Scales },
  { label: "Medicine", value: "stethoscope", icon: Stethoscope },
  { label: "Art", value: "palette", icon: Palette },
  { label: "Film", value: "film", icon: FilmStrip },
  { label: "Music", value: "music", icon: MusicNote },
  { label: "Photo", value: "camera", icon: Camera },
  { label: "Nature", value: "leaf", icon: Leaf },
  { label: "Compass", value: "compass", icon: Compass },
  { label: "Rocket", value: "rocket", icon: Rocket },
  { label: "Lightning", value: "lightning", icon: Lightning },
  { label: "Puzzle", value: "puzzle", icon: PuzzlePiece },
  { label: "Engineering", value: "wrench", icon: Wrench },
  { label: "Briefcase", value: "briefcase", icon: Briefcase },
  { label: "Home", value: "house", icon: House },
  { label: "Trophy", value: "trophy", icon: Trophy },
  { label: "Gaming", value: "game", icon: GameController },
  { label: "Megaphone", value: "megaphone", icon: Megaphone },
  { label: "Shield", value: "shield", icon: ShieldStar },
  { label: "Heart", value: "heart", icon: Heart },
  { label: "Star", value: "star", icon: Star },
] as const;

// Map stored icon value → Phosphor component
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; weight?: "duotone" }>> = Object.fromEntries(
  FOLDER_ICONS.filter((i) => i.icon).map((i) => [i.value, i.icon!])
);

// ── Types ──────────────────────────────────────────────

interface NoteItem {
  id: string;
  title: string;
  folderId?: string | null;
  paperStyle: string;
  paperColor: string;
  font: string;
  updatedAt: Date;
  createdAt: Date;
}

interface FolderItem {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  parentId: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface NotesExplorerProps {
  notes: NoteItem[];
  folders: FolderItem[];
  breadcrumbs: BreadcrumbItem[];
  currentFolderId: string | null;
}

// ── Component ──────────────────────────────────────────

export function NotesExplorer({
  notes: initialNotes,
  folders: initialFolders,
  breadcrumbs,
  currentFolderId,
}: NotesExplorerProps) {
  const router = useRouter();

  // Optimistic local state
  const [localFolders, setLocalFolders] = useState(initialFolders);
  const [localNotes, setLocalNotes] = useState(initialNotes);

  // Sync from server when props change (navigation)
  useEffect(() => { setLocalFolders(initialFolders); }, [initialFolders]);
  useEffect(() => { setLocalNotes(initialNotes); }, [initialNotes]);

  // UI state
  const [creating, setCreating] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Folder form state
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState<string>(FOLDER_COLORS[0].value);
  const [folderIcon, setFolderIcon] = useState("");
  const folderNameRef = useRef<HTMLInputElement>(null);

  const hasSelection = selectedNotes.size > 0 || selectedFolders.size > 0;
  const isEmpty = localFolders.length === 0 && localNotes.length === 0;

  // Reset select mode on folder change
  useEffect(() => {
    setSelectMode(false);
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
  }, [currentFolderId]);

  // ── Folder modal helpers ─────────────────────────────

  const openFolderModal = () => {
    setFolderName("");
    setFolderColor(FOLDER_COLORS[0].value);
    setFolderIcon("");
    setShowFolderModal(true);
    setTimeout(() => folderNameRef.current?.focus(), 100);
  };

  const closeFolderModal = () => {
    setShowFolderModal(false);
  };

  // ── Actions ──────────────────────────────────────────

  const handleCreateNote = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createNote({ folderId: currentFolderId || undefined });
      router.push(`/dashboard/space/notes/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleCreateFolder = () => {
    const name = folderName.trim();
    if (!name) return;

    // Optimistic: add to local state immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticFolder: FolderItem = {
      id: tempId,
      name,
      color: folderColor,
      icon: folderIcon || null,
      parentId: currentFolderId,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setLocalFolders((prev) => [...prev, optimisticFolder]);
    closeFolderModal();

    // Background: create on server
    createFolder({
      name,
      parentId: currentFolderId || undefined,
      color: folderColor,
      icon: folderIcon || undefined,
    })
      .then((realId) => {
        setLocalFolders((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, id: realId } : f))
        );
      })
      .catch(() => {
        setLocalFolders((prev) => prev.filter((f) => f.id !== tempId));
      });
  };

  const handleDeleteSelected = () => {
    const removedNotes = localNotes.filter((n) => selectedNotes.has(n.id));
    const removedFolders = localFolders.filter((f) => selectedFolders.has(f.id));
    setLocalNotes((prev) => prev.filter((n) => !selectedNotes.has(n.id)));
    setLocalFolders((prev) => prev.filter((f) => !selectedFolders.has(f.id)));

    const noteIds = [...selectedNotes];
    const folderIds = [...selectedFolders];
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
    setSelectMode(false);

    const promises: Promise<void | string>[] = [];
    for (const id of noteIds) promises.push(deleteNote(id));
    for (const id of folderIds) promises.push(deleteFolder(id));
    Promise.all(promises).catch(() => {
      setLocalNotes((prev) => [...prev, ...removedNotes]);
      setLocalFolders((prev) => [...prev, ...removedFolders]);
    });
  };

  const handleToggleNote = (noteId: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleToggleFolder = (folderId: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleMoveToRoot = () => {
    const removedNotes = localNotes.filter((n) => selectedNotes.has(n.id));
    const removedFolders = localFolders.filter((f) => selectedFolders.has(f.id));
    setLocalNotes((prev) => prev.filter((n) => !selectedNotes.has(n.id)));
    setLocalFolders((prev) => prev.filter((f) => !selectedFolders.has(f.id)));

    const noteIds = [...selectedNotes];
    const folderIds = [...selectedFolders];
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
    setSelectMode(false);

    const promises: Promise<void>[] = [];
    if (noteIds.length > 0) promises.push(moveNotes(noteIds, null));
    if (folderIds.length > 0) promises.push(moveFolders(folderIds, null));
    Promise.all(promises).catch(() => {
      setLocalNotes((prev) => [...prev, ...removedNotes]);
      setLocalFolders((prev) => [...prev, ...removedFolders]);
    });
  };

  const handleCancelSelect = () => {
    setSelectedNotes(new Set());
    setSelectedFolders(new Set());
    setSelectMode(false);
  };

  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  // Get icon component for a folder
  const getFolderIconNode = (iconValue: string | null) => {
    if (!iconValue) return undefined;
    const IconComp = ICON_MAP[iconValue];
    if (!IconComp) return undefined;
    return <IconComp size={24} weight="duotone" />;
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
          className="mb-4 flex items-center justify-center gap-1.5 text-xs"
        >
          <Link
            href="/dashboard/space/notes"
            className="text-gray-900/40 transition-colors hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/70"
          >
            Notes
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <span className="text-gray-900/20 dark:text-white/20">/</span>
              <Link
                href={`/dashboard/space/notes?folder=${crumb.id}`}
                className="text-gray-900/40 transition-colors hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/70"
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </motion.div>
      )}

      {/* Action bar — centered */}
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex flex-wrap items-center justify-center gap-2"
      >
        <AnimatePresence mode="popLayout">
          {!selectMode && (
            <motion.button
              key="create-note"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease }}
              onClick={handleCreateNote}
              disabled={creating}
              className="rounded-full border border-dashed border-gray-900/15 px-5 py-2.5 text-sm text-gray-900/40 transition-colors hover:border-gray-900/30 hover:text-gray-900/60 disabled:opacity-50 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
            >
              {creating ? "Creating..." : "+ Note"}
            </motion.button>
          )}

          {!selectMode && (
            <motion.button
              key="create-folder"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease }}
              onClick={openFolderModal}
              className="rounded-full border border-dashed border-gray-900/15 px-5 py-2.5 text-sm text-gray-900/40 transition-colors hover:border-gray-900/30 hover:text-gray-900/60 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
            >
              + Folder
            </motion.button>
          )}
        </AnimatePresence>

        {(localFolders.length > 0 || localNotes.length > 0) && (
          <motion.button
            layout
            transition={{ duration: 0.3, ease }}
            onClick={() => {
              if (selectMode) handleCancelSelect();
              else setSelectMode(true);
            }}
            className={`rounded-full px-4 py-2.5 text-xs transition-colors ${
              selectMode
                ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                : "text-gray-900/30 hover:text-gray-900/50 dark:text-white/30 dark:hover:text-white/50"
            }`}
          >
            {selectMode ? "Done" : "Select"}
          </motion.button>
        )}

      </motion.div>

      {/* Selection actions bar */}
      <AnimatePresence>
        {selectMode && hasSelection && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mx-auto flex max-w-md items-center justify-center gap-3 overflow-hidden rounded-full bg-gray-900/5 px-5 py-2.5 dark:bg-white/5"
          >
            <span className="text-xs text-gray-900/50 dark:text-white/50">
              {selectedNotes.size + selectedFolders.size} selected
            </span>
            {currentFolderId && (
              <button
                onClick={handleMoveToRoot}
                className="rounded-full px-3 py-1.5 text-xs text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:text-white/60 dark:hover:bg-white/10"
              >
                Move To Root
              </button>
            )}
            <button
              onClick={handleDeleteSelected}
              className="rounded-full px-3 py-1.5 text-xs text-red-500/80 transition-colors hover:bg-red-500/10 dark:text-red-400/80 dark:hover:bg-red-400/10"
            >
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {isEmpty && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="py-16 text-center text-sm text-gray-900/30 dark:text-white/30"
        >
          {currentFolderId
            ? "This folder is empty."
            : "No notes yet. Create your first one."}
        </motion.p>
      )}

      {/* Folders grid — centered */}
      {localFolders.length > 0 && (
        <div className="mb-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease }}
            className="mb-6 text-center text-xs text-gray-900/30 dark:text-white/30"
          >
            Folders
          </motion.p>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
            {localFolders.map((folder, i) => {
              const isTemp = folder.id.startsWith("temp-");
              const folderHref = `/dashboard/space/notes?folder=${folder.id}`;
              const iconNode = getFolderIconNode(folder.icon);

              if (selectMode) {
                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease, delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <NoteFolder
                      name={folder.name}
                      color={folder.color}
                      icon={iconNode}
                      selected={selectedFolders.has(folder.id)}
                      onClick={() => handleToggleFolder(folder.id)}
                    />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isTemp ? 0.6 : 1 }}
                  transition={{ duration: 0.5, ease, delay: Math.min(i * 0.05, 0.3) }}
                >
                  {isTemp ? (
                    <NoteFolder name={folder.name} color={folder.color} icon={iconNode} />
                  ) : (
                    <Link href={folderHref}>
                      <NoteFolder name={folder.name} color={folder.color} icon={iconNode} />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes — grid or list */}
      {localNotes.length > 0 && (
        <div>
          {localFolders.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease }}
              className="mb-6 text-center text-xs text-gray-900/30 dark:text-white/30"
            >
              Notes
            </motion.p>
          )}

          <div className="mx-auto grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
              {localNotes.map((n, i) => {
                const paperBg =
                  PAPER_STYLES[n.paperStyle as keyof typeof PAPER_STYLES] || PAPER_STYLES.blank;
                const isSelected = selectMode && selectedNotes.has(n.id);

                const noteCard = (
                  <div
                    className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border bg-white/50 text-left backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg dark:bg-white/5 ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20"
                        : "border-gray-900/8 dark:border-white/10"
                    }`}
                  >
                    {/* Paper preview strip */}
                    <div
                      className="h-16 sm:h-20"
                      style={{
                        backgroundColor: n.paperColor,
                        backgroundImage: paperBg.background,
                        backgroundSize: "backgroundSize" in paperBg ? paperBg.backgroundSize : undefined,
                      }}
                    />
                    {/* Title area */}
                    <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
                      <p className="truncate font-display text-sm font-light text-gray-900 dark:text-white">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[9px] text-gray-900/35 dark:text-white/35">
                        {formatDate(n.updatedAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease, delay: Math.min(i * 0.03, 0.25) }}
                    whileHover={selectMode ? undefined : { scale: 1.03 }}
                  >
                    {selectMode ? (
                      <div onClick={() => handleToggleNote(n.id)}>{noteCard}</div>
                    ) : (
                      <Link href={`/dashboard/space/notes/${n.id}`}>{noteCard}</Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
        </div>
      )}

      {/* ── New Folder Modal (portalled to body to escape maskImage) ── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showFolderModal && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="fixed inset-0 z-50 bg-black/40"
                  onClick={closeFolderModal}
                />

                {/* Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2, ease }}
                  className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85vh] max-w-md -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-900/10 bg-white p-5 shadow-xl dark:border-white/15 dark:bg-[var(--background)]"
                >
                  <h3 className="text-center font-display text-lg font-light text-gray-900 dark:text-white">
                    New Folder
                  </h3>
                  <p className="mt-0.5 text-center text-xs text-gray-400 dark:text-white/40">
                    Organize your notes
                  </p>

                  <div className="mt-5 flex flex-col gap-4">
                    {/* Preview */}
                    <div className="flex justify-center py-2">
                      <NoteFolder
                        name={folderName || "Folder"}
                        color={folderColor}
                        icon={
                          folderIcon && ICON_MAP[folderIcon]
                            ? (() => {
                                const Icon = ICON_MAP[folderIcon];
                                return <Icon size={24} weight="duotone" />;
                              })()
                            : undefined
                        }
                      />
                    </div>

                    {/* Name input */}
                    <input
                      ref={folderNameRef}
                      type="text"
                      placeholder="Folder name..."
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateFolder();
                        if (e.key === "Escape") closeFolderModal();
                      }}
                      className="h-10 w-full rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 placeholder:text-gray-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30"
                    />

                    {/* Color picker */}
                    <div>
                      <p className="mb-2.5 text-center text-xs text-gray-900/40 dark:text-white/40">
                        Color
                      </p>
                      <div className="grid grid-cols-10 gap-0 place-items-center">
                        {FOLDER_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setFolderColor(c.value)}
                            className={`h-8 w-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                              folderColor === c.value
                                ? "scale-115 border-gray-900/40 shadow-sm dark:border-white/50"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Icon picker */}
                    <div>
                      <p className="mb-2.5 text-center text-xs text-gray-900/40 dark:text-white/40">
                        Icon
                      </p>
                      <div className="grid grid-cols-6 gap-1.5 place-items-center">
                        {FOLDER_ICONS.map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setFolderIcon(item.value)}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                              folderIcon === item.value
                                ? "bg-gray-900/10 text-gray-900 ring-1 ring-gray-900/20 dark:bg-white/15 dark:text-white dark:ring-white/20"
                                : "text-gray-900/40 hover:bg-gray-900/5 hover:text-gray-900/60 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/60"
                            }`}
                            title={item.label}
                          >
                            {item.icon ? (
                              <item.icon size={22} weight="duotone" />
                            ) : (
                              <span className="text-[10px]">None</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={closeFolderModal}
                        className="flex-1 rounded-full bg-gray-900/5 py-2.5 text-sm font-medium text-gray-900/60 transition-colors duration-200 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateFolder}
                        disabled={!folderName.trim()}
                        className="flex-1 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-40"
                      >
                        Create Folder
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
