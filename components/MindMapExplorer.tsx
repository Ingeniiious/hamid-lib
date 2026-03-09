"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import NoteFolder from "@/components/NoteFolder";
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
  createMindMap,
  createMindMapFolder,
  deleteMindMap,
  deleteMindMapFolder,
  moveMindMaps,
  moveMindMapFolders,
} from "@/app/(main)/dashboard/space/mindmap/actions";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const ease = EASE as unknown as [number, number, number, number];

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

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; weight?: "duotone" }>> = Object.fromEntries(
  FOLDER_ICONS.filter((i) => i.icon).map((i) => [i.value, i.icon!])
);

// ── Types ──────────────────────────────────────────────

interface MindMapItem {
  id: string;
  name: string;
  folderId?: string | null;
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

interface MindMapExplorerProps {
  mindMaps: MindMapItem[];
  folders: FolderItem[];
  breadcrumbs: BreadcrumbItem[];
  currentFolderId: string | null;
}

// ── Component ──────────────────────────────────────────

export function MindMapExplorer({
  mindMaps: initialMindMaps,
  folders: initialFolders,
  breadcrumbs,
  currentFolderId,
}: MindMapExplorerProps) {
  const router = useRouter();

  const [localFolders, setLocalFolders] = useState(initialFolders);
  const [localMindMaps, setLocalMindMaps] = useState(initialMindMaps);

  useEffect(() => { setLocalFolders(initialFolders); }, [initialFolders]);
  useEffect(() => { setLocalMindMaps(initialMindMaps); }, [initialMindMaps]);

  const [creating, setCreating] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState<string>(FOLDER_COLORS[0].value);
  const [folderIcon, setFolderIcon] = useState("");
  const folderNameRef = useRef<HTMLInputElement>(null);

  const hasSelection = selectedMaps.size > 0 || selectedFolders.size > 0;
  const isEmpty = localFolders.length === 0 && localMindMaps.length === 0;

  useEffect(() => {
    setSelectMode(false);
    setSelectedMaps(new Set());
    setSelectedFolders(new Set());
  }, [currentFolderId]);

  const openFolderModal = () => {
    setFolderName("");
    setFolderColor(FOLDER_COLORS[0].value);
    setFolderIcon("");
    setShowFolderModal(true);
    setTimeout(() => folderNameRef.current?.focus(), 100);
  };

  const closeFolderModal = () => setShowFolderModal(false);

  // ── Actions ──────────────────────────────────────────

  const handleCreateMindMap = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createMindMap({ folderId: currentFolderId || undefined });
      router.push(`/dashboard/space/mindmap/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleCreateFolder = () => {
    const name = folderName.trim();
    if (!name) return;

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

    createMindMapFolder({
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

  const handleDeleteMindMap = (e: React.MouseEvent, mapId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const removed = localMindMaps.find((m) => m.id === mapId);
    setLocalMindMaps((prev) => prev.filter((m) => m.id !== mapId));
    deleteMindMap(mapId).catch(() => {
      if (removed) setLocalMindMaps((prev) => [...prev, removed]);
    });
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const removed = localFolders.find((f) => f.id === folderId);
    setLocalFolders((prev) => prev.filter((f) => f.id !== folderId));
    deleteMindMapFolder(folderId).catch(() => {
      if (removed) setLocalFolders((prev) => [...prev, removed]);
    });
  };

  const handleToggleMap = (mapId: string) => {
    setSelectedMaps((prev) => {
      const next = new Set(prev);
      if (next.has(mapId)) next.delete(mapId); else next.add(mapId);
      return next;
    });
  };

  const handleToggleFolder = (folderId: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const handleMoveToRoot = () => {
    const removedMaps = localMindMaps.filter((m) => selectedMaps.has(m.id));
    const removedFolders = localFolders.filter((f) => selectedFolders.has(f.id));
    setLocalMindMaps((prev) => prev.filter((m) => !selectedMaps.has(m.id)));
    setLocalFolders((prev) => prev.filter((f) => !selectedFolders.has(f.id)));

    const mapIds = [...selectedMaps];
    const folderIds = [...selectedFolders];
    setSelectedMaps(new Set());
    setSelectedFolders(new Set());
    setSelectMode(false);

    const promises: Promise<void>[] = [];
    if (mapIds.length > 0) promises.push(moveMindMaps(mapIds, null));
    if (folderIds.length > 0) promises.push(moveMindMapFolders(folderIds, null));
    Promise.all(promises).catch(() => {
      setLocalMindMaps((prev) => [...prev, ...removedMaps]);
      setLocalFolders((prev) => [...prev, ...removedFolders]);
    });
  };

  const handleCancelSelect = () => {
    setSelectedMaps(new Set());
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
            href="/dashboard/space/mindmap"
            className="text-gray-900/40 transition-colors hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/70"
          >
            Mind Map
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <span className="text-gray-900/20 dark:text-white/20">/</span>
              <Link
                href={`/dashboard/space/mindmap?folder=${crumb.id}`}
                className="text-gray-900/40 transition-colors hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/70"
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </motion.div>
      )}

      {/* Action bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex flex-wrap items-center justify-center gap-2"
      >
        <button
          onClick={handleCreateMindMap}
          disabled={creating}
          className="rounded-full border border-dashed border-gray-900/15 px-5 py-2.5 text-sm text-gray-900/40 transition-colors hover:border-gray-900/30 hover:text-gray-900/60 disabled:opacity-50 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
        >
          {creating ? "Creating..." : "+ Mind Map"}
        </button>

        <button
          onClick={openFolderModal}
          className="rounded-full border border-dashed border-gray-900/15 px-5 py-2.5 text-sm text-gray-900/40 transition-colors hover:border-gray-900/30 hover:text-gray-900/60 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
        >
          + Folder
        </button>

        {(localFolders.length > 0 || localMindMaps.length > 0) && (
          <button
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
            {selectMode ? "Cancel" : "Select"}
          </button>
        )}
      </motion.div>

      {/* Selection actions bar */}
      <AnimatePresence>
        {selectMode && hasSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="mx-auto mb-6 flex max-w-md items-center justify-center gap-3 rounded-full bg-gray-900/5 px-5 py-2.5 dark:bg-white/5"
          >
            <span className="text-xs text-gray-900/50 dark:text-white/50">
              {selectedMaps.size + selectedFolders.size} selected
            </span>
            {currentFolderId && (
              <button
                onClick={handleMoveToRoot}
                className="rounded-full px-3 py-1.5 text-xs text-gray-900/60 transition-colors hover:bg-gray-900/10 dark:text-white/60 dark:hover:bg-white/10"
              >
                Move To Root
              </button>
            )}
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
            : "No mind maps yet. Create your first one."}
        </motion.p>
      )}

      {/* Folders grid */}
      {localFolders.length > 0 && (
        <div className="mb-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease }}
            className="mb-4 text-center text-xs text-gray-900/30 dark:text-white/30"
          >
            Folders
          </motion.p>
          <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
            {localFolders.map((folder, i) => {
              const isTemp = folder.id.startsWith("temp-");
              const folderHref = `/dashboard/space/mindmap?folder=${folder.id}`;
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
                  className="group relative"
                >
                  {isTemp ? (
                    <NoteFolder name={folder.name} color={folder.color} icon={iconNode} />
                  ) : (
                    <Link href={folderHref}>
                      <NoteFolder name={folder.name} color={folder.color} icon={iconNode} />
                    </Link>
                  )}
                  {!isTemp && (
                    <button
                      onClick={(e) => handleDeleteFolder(e, folder.id)}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-900/0 transition-colors group-hover:text-gray-900/20 hover:!text-red-500 dark:text-white/0 dark:group-hover:text-white/20 dark:hover:!text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mind maps grid */}
      {localMindMaps.length > 0 && (
        <div>
          {localFolders.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease }}
              className="mb-4 text-center text-xs text-gray-900/30 dark:text-white/30"
            >
              Mind Maps
            </motion.p>
          )}
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {localMindMaps.map((m, i) => {
              const cardContent = (
                <div
                  className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-shadow hover:shadow-md ${
                    selectMode && selectedMaps.has(m.id)
                      ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20"
                      : "border-gray-900/8 dark:border-white/10"
                  }`}
                >
                  {/* Mini canvas preview */}
                  <div className="relative aspect-[4/3] bg-gray-50 p-4 dark:bg-white/5">
                    <svg viewBox="0 0 160 120" className="h-full w-full opacity-30">
                      {/* Decorative node graph */}
                      <line x1="80" y1="40" x2="40" y2="80" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="80" y1="40" x2="120" y2="80" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="80" y1="40" x2="80" y2="10" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="80" cy="40" r="8" fill="currentColor" opacity="0.6" />
                      <circle cx="40" cy="80" r="6" fill="currentColor" opacity="0.4" />
                      <circle cx="120" cy="80" r="6" fill="currentColor" opacity="0.4" />
                      <circle cx="80" cy="10" r="5" fill="currentColor" opacity="0.3" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-900/5 bg-white/80 px-3 py-2 backdrop-blur-sm dark:border-white/5 dark:bg-gray-900/80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-gray-900/40 dark:text-white/40">
                        {formatDate(m.updatedAt)}
                      </p>
                    </div>
                    {!selectMode && (
                      <button
                        onClick={(e) => handleDeleteMindMap(e, m.id)}
                        className="ml-2 rounded-md p-1 text-xs text-gray-900/0 transition-colors group-hover:text-gray-900/30 hover:!text-red-500 dark:text-white/0 dark:group-hover:text-white/30 dark:hover:!text-red-400"
                        title="Delete"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease, delay: Math.min(i * 0.05, 0.3) }}
                  whileHover={selectMode ? undefined : { scale: 1.02 }}
                >
                  {selectMode ? (
                    <div onClick={() => handleToggleMap(m.id)}>{cardContent}</div>
                  ) : (
                    <Link href={`/dashboard/space/mindmap/${m.id}`}>{cardContent}</Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showFolderModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className="fixed inset-0 z-50 bg-black/40"
                  onClick={closeFolderModal}
                />
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
                    Organize your mind maps
                  </p>

                  <div className="mt-5 flex flex-col gap-4">
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
