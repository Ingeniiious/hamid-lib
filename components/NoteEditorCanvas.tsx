"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Tldraw,
  getSnapshot,
  useEditor,
  track,
  atom,
  type TLComponents,
  type Editor,
} from "tldraw";
import type { TLAssetStore } from "@tldraw/tlschema";
import {
  DefaultSizeStyle,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  GeoShapeGeoStyle,
} from "@tldraw/tlschema";
import "tldraw/tldraw.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  PAPER_STYLES,
  PAPER_COLORS,
  PAPER_SIZES,
  LINE_ALIGNS,
  LINE_HEIGHT,
  NOTE_FONTS,
  FONT_SIZES,
  isDarkColor,
  type PaperStyle,
  type PaperColor,
  type NoteFont,
  type PaperSize,
  type LineAlign,
  type FontSize,
} from "@/lib/note-styles";
import { updateNote } from "@/app/(main)/dashboard/space/notes/actions";
import {
  Cursor,
  PencilSimple,
  Eraser,
  Hand,
  TextAa,
  Rectangle,
  ImageSquare,
  ArrowCounterClockwise,
  ArrowClockwise,
  Plus,
  CaretLeft,
  CaretRight,
  Trash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Highlighter,
  Circle,
  Triangle,
  Diamond,
  Star,
  Heart,
  Cloud,
  Hexagon,
  Pentagon,
  Octagon,
  ArrowUpRight,
  LineSegment,
  CaretDown,
} from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ==================
// Reactive atoms — paper settings shared with tldraw components
// Using tldraw atoms so track() picks up changes automatically
// ==================

const paperStyleAtom = atom<PaperStyle>("paperStyle", "blank");
const paperColorAtom = atom<string>("paperColor", "#ffffff");
const lineAlignAtom = atom<LineAlign>("lineAlign", "between");

// ==================
// Asset store — uploads images to R2 instead of embedding base64
// ==================

const noteAssetStore: TLAssetStore = {
  async upload(_asset, file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/notes/upload-image", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    const { url } = await res.json();
    return { src: url };
  },
  resolve(asset) {
    // Backward compatible: existing base64 data URLs still work
    return asset.props.src;
  },
};

// ==================
// Custom Background — paper color + grid/lines/dots via CSS
// Merging Background + Grid into one component avoids z-index stacking issues
// ==================

const NotebookBackground = track(function NotebookBackground() {
  const editor = useEditor();
  const color = paperColorAtom.get();
  const paperStyle = paperStyleAtom.get();

  const camera = editor.getCamera();
  const zoom = camera.z;
  const spacing = LINE_HEIGHT;

  // Adaptive line color — light lines on dark paper, dark lines on light paper
  const dark = isDarkColor(color);
  const lineColor = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const gridColor = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const dotColor = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)";

  const style: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: color,
    transition: "background-color 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
  };

  if (paperStyle !== "blank" && spacing * zoom >= 4) {
    const s = spacing * zoom;
    const ox = camera.x * zoom;
    const oy = camera.y * zoom;

    if (paperStyle === "lined") {
      style.backgroundImage = `repeating-linear-gradient(transparent, transparent ${s - 1}px, ${lineColor} ${s - 1}px, ${lineColor} ${s}px)`;
      style.backgroundPosition = `0px ${oy % s}px`;
      style.backgroundSize = `100% ${s}px`;
    } else if (paperStyle === "grid") {
      style.backgroundImage = [
        `repeating-linear-gradient(transparent, transparent ${s - 1}px, ${gridColor} ${s - 1}px, ${gridColor} ${s}px)`,
        `repeating-linear-gradient(90deg, transparent, transparent ${s - 1}px, ${gridColor} ${s - 1}px, ${gridColor} ${s}px)`,
      ].join(", ");
      style.backgroundPosition = `${ox % s}px ${oy % s}px`;
      style.backgroundSize = `${s}px ${s}px`;
    } else if (paperStyle === "dotted") {
      const ds = spacing * 0.75 * zoom;
      if (ds >= 4) {
        style.backgroundImage = `radial-gradient(circle, ${dotColor} ${Math.max(0.8, zoom * 0.8)}px, transparent ${Math.max(0.8, zoom * 0.8)}px)`;
        style.backgroundPosition = `${ox % ds}px ${oy % ds}px`;
        style.backgroundSize = `${ds}px ${ds}px`;
      }
    }
  }

  return <div style={style} />;
});

// Grid component — not needed since patterns are rendered via CSS in Background
const NotebookGrid = track(function NotebookGrid() {
  return null;
});

// tldraw canvas components — no default UI, just our custom grid + background
const tldrawComponents: TLComponents = {
  Background: NotebookBackground,
  Grid: NotebookGrid,
};

// Simple tools — no dropdown, just activate on click
const SIMPLE_TOOLS = [
  { id: "select", label: "Select", icon: Cursor },
  { id: "hand", label: "Pan", icon: Hand },
] as const;

// Drawing tools — each gets a dropdown popover with relevant style options
const DRAWING_TOOLS = [
  { id: "draw", label: "Draw", icon: PencilSimple, hasColor: true, hasSize: true, hasStroke: true },
  { id: "highlight", label: "Highlight", icon: Highlighter, hasColor: true, hasSize: true },
  { id: "eraser", label: "Eraser", icon: Eraser, hasSize: true },
  { id: "text", label: "Text", icon: TextAa, hasColor: true, hasSize: true },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight, hasColor: true, hasSize: true, hasFill: true, hasStroke: true },
  { id: "line", label: "Line", icon: LineSegment, hasColor: true, hasSize: true, hasStroke: true },
] as const;

// Geo shape options — shown in shape picker dropdown
const GEO_SHAPES = [
  { id: "rectangle", label: "Rectangle", icon: Rectangle },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "star", label: "Star", icon: Star },
  { id: "heart", label: "Heart", icon: Heart },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "hexagon", label: "Hexagon", icon: Hexagon },
  { id: "pentagon", label: "Pentagon", icon: Pentagon },
  { id: "octagon", label: "Octagon", icon: Octagon },
] as const;

// tldraw color palette
const TLDRAW_COLORS = [
  { id: "black", hex: "#1d1d1d" },
  { id: "grey", hex: "#adb5bd" },
  { id: "white", hex: "#ffffff" },
  { id: "red", hex: "#e03131" },
  { id: "light-red", hex: "#ff8787" },
  { id: "orange", hex: "#ff8534" },
  { id: "yellow", hex: "#ffc034" },
  { id: "green", hex: "#099268" },
  { id: "light-green", hex: "#40c057" },
  { id: "blue", hex: "#4263eb" },
  { id: "light-blue", hex: "#4dabf7" },
  { id: "violet", hex: "#ae3ec9" },
  { id: "light-violet", hex: "#c9b1ff" },
] as const;

const FILL_STYLES = [
  { id: "none", label: "None" },
  { id: "semi", label: "Semi" },
  { id: "solid", label: "Solid" },
  { id: "pattern", label: "Pattern" },
] as const;

const DASH_STYLES = [
  { id: "draw", label: "Draw" },
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
] as const;

// ==================
// Text-to-line magnetic snapping
// Snaps text shapes to the nearest paper line on lined/grid paper
// ==================

function snapYToLine(y: number): number {
  const style = paperStyleAtom.get();
  if (style !== "lined" && style !== "grid") return y;
  const align = lineAlignAtom.get();
  const offset = LINE_ALIGNS[align]?.offset ?? 0;
  return Math.round((y - offset) / LINE_HEIGHT) * LINE_HEIGHT + offset;
}

// ==================
// NoteEditorCanvas — tldraw inside the notebook paper card
// ==================

export interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string | null;
  initialPaperStyle: string;
  initialPaperColor: string;
  initialPaperSize: string;
  initialLineAlign: string;
  initialFont: string;
}

export default function NoteEditorCanvas({
  noteId,
  initialTitle,
  initialContent,
  initialPaperStyle,
  initialPaperColor,
  initialPaperSize,
  initialLineAlign,
  initialFont,
}: NoteEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>(
    initialPaperStyle as PaperStyle
  );
  const [paperColor, setPaperColor] = useState<PaperColor>(initialPaperColor);
  const [paperSize, setPaperSize] = useState<PaperSize>(
    initialPaperSize as PaperSize
  );
  const [lineAlign, setLineAlign] = useState<LineAlign>(
    initialLineAlign as LineAlign
  );
  const [font, setFont] = useState<NoteFont>(initialFont as NoteFont);
  const [fontSize, setFontSize] = useState<FontSize>("m");
  const [customColor, setCustomColor] = useState(initialPaperColor);
  const [saving, setSaving] = useState(false);

  // Style panel state — typed to match tldraw's style value unions
  const [activeColor, setActiveColor] = useState<(typeof TLDRAW_COLORS)[number]["id"]>("black");
  const [activeFill, setActiveFill] = useState<(typeof FILL_STYLES)[number]["id"]>("none");
  const [activeDash, setActiveDash] = useState<(typeof DASH_STYLES)[number]["id"]>("draw");
  const [activeGeo, setActiveGeo] = useState<(typeof GEO_SHAPES)[number]["id"]>("rectangle");
  const [opacity, setOpacity] = useState(1);
  // Only one tool dropdown open at a time
  const [openToolDropdown, setOpenToolDropdown] = useState<string | null>(null);

  // Sync atoms eagerly during render so tldraw's track()-wrapped Background/Grid
  // components see the correct values immediately. The React warning about
  // "setState during render" is expected — tldraw atoms aren't React state.
  paperStyleAtom.set(paperStyle);
  paperColorAtom.set(paperColor);
  lineAlignAtom.set(lineAlign);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [pageInfo, setPageInfo] = useState({ currentIndex: 0, total: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse initial content — tldraw snapshot or legacy
  const initialSnapshot = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      const parsed = JSON.parse(initialContent);
      if (parsed && parsed.document) return parsed;
      return undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  // Save ref — always points to latest
  const saveRef = useRef<(e: Editor) => Promise<void>>(async () => {});

  const save = useCallback(
    async (e: Editor) => {
      setSaving(true);
      try {
        const snapshot = getSnapshot(e.store);
        await updateNote(noteId, {
          title,
          content: JSON.stringify(snapshot),
          paperStyle,
          paperColor,
          paperSize,
          lineAlign,
          font,
        });
      } catch {
        // Fail silently — auto-save retries
      }
      setSaving(false);
    },
    [noteId, title, paperStyle, paperColor, paperSize, lineAlign, font]
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const syncPages = useCallback((e: Editor) => {
    const pages = e.getPages();
    const currentId = e.getCurrentPageId();
    const idx = pages.findIndex((p) => p.id === currentId);
    setPageInfo({ currentIndex: Math.max(0, idx), total: pages.length });
  }, []);

  const handleMount = useCallback(
    (e: Editor) => {
      setEditor(e);
      // Grid mode OFF — shapes/arrows/lines move freely with no snapping.
      // Only text gets magnetic line-snapping (handled below).
      e.updateInstanceState({ isGridMode: false });
      syncPages(e);

      const getPaperWidth = () => {
        const sz = PAPER_SIZES[paperSizeRef.current] ?? PAPER_SIZES.a4;
        return sz.width;
      };
      const textPadding = 24; // px padding from paper edges

      // On text creation: instant snap + auto-wrap (new shapes don't need animation)
      const cleanupAfterCreate = e.sideEffects.registerAfterCreateHandler(
        "shape",
        (shape) => {
          if (shape.type !== "text") return;
          const pw = getPaperWidth();
          const maxW = pw - textPadding * 2;
          const snappedY = snapYToLine(shape.y);
          const clampedX = Math.max(textPadding, Math.min(shape.x, pw - textPadding - 20));
          const availW = pw - clampedX - textPadding;

          const updates: Record<string, unknown> = {
            id: shape.id,
            type: "text",
          };

          if (Math.abs(shape.y - snappedY) >= 1) updates.y = snappedY;
          if (Math.abs(shape.x - clampedX) >= 1) updates.x = clampedX;

          if ((shape.props as { autoSize?: boolean }).autoSize !== false) {
            updates.props = {
              autoSize: false,
              w: Math.min(maxW, availW),
            };
          }

          if (Object.keys(updates).length > 2) {
            e.updateShape(updates as Parameters<typeof e.updateShape>[0]);
          }
        }
      );

      // On text move: debounced smooth snap — text moves freely during drag,
      // then gently glides to the nearest line when the user releases.
      let snapTimer: ReturnType<typeof setTimeout> | null = null;
      let isSnapping = false; // guard against re-entrant snap triggers

      const cleanupAfterChange = e.sideEffects.registerAfterChangeHandler(
        "shape",
        (prev, next) => {
          if (next.type !== "text") return;
          if (prev.x === next.x && prev.y === next.y) return;
          if (isSnapping) return; // ignore position changes from our own animation

          // Debounce: wait 120ms after the last move before snapping.
          // This means text moves freely while dragging and only
          // snaps once the user stops / releases.
          if (snapTimer) clearTimeout(snapTimer);
          const shapeId = next.id;
          snapTimer = setTimeout(() => {
            const shape = e.getShape(shapeId);
            if (!shape || shape.type !== "text") return;

            const pw = getPaperWidth();
            const snappedY = snapYToLine(shape.y);
            const clampedX = Math.max(textPadding, Math.min(shape.x, pw - textPadding - 20));

            const needsSnapY = Math.abs(shape.y - snappedY) >= 1;
            const needsClampX = Math.abs(shape.x - clampedX) >= 1;

            if (!needsSnapY && !needsClampX) return;

            isSnapping = true;
            e.animateShape(
              {
                id: shape.id,
                type: "text",
                ...(needsSnapY && { y: snappedY }),
                ...(needsClampX && { x: clampedX }),
              },
              { animation: { duration: 180, easing: (t) => 1 - Math.pow(1 - t, 3) } }
            );
            // Reset guard after animation completes
            setTimeout(() => { isSnapping = false; }, 200);
          }, 120);
        }
      );

      return () => {
        cleanupAfterCreate();
        cleanupAfterChange();
        if (snapTimer) clearTimeout(snapTimer);
      };
    },
    [syncPages]
  );

  // Keep a ref to current paperSize so the mount callback can read it
  const paperSizeRef = useRef(paperSize);
  paperSizeRef.current = paperSize;

  // Auto-save on canvas changes
  useEffect(() => {
    if (!editor) return;
    const cleanup = editor.store.listen(
      () => {
        syncPages(editor);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => saveRef.current(editor), 1500);
      },
      { source: "user", scope: "document" }
    );
    return cleanup;
  }, [editor, syncPages]);

  // Save on settings/title change
  useEffect(() => {
    if (!editor) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveRef.current(editor), 1500);
  }, [editor, paperStyle, paperColor, paperSize, lineAlign, font, title]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Sync font size with tldraw — sets size for next + selected shapes
  useEffect(() => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultSizeStyle, fontSize);
    editor.setStyleForSelectedShapes(DefaultSizeStyle, fontSize);
  }, [editor, fontSize]);

  // Sync style panel with tldraw
  useEffect(() => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultColorStyle, activeColor);
    editor.setStyleForSelectedShapes(DefaultColorStyle, activeColor);
  }, [editor, activeColor]);

  useEffect(() => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultFillStyle, activeFill);
    editor.setStyleForSelectedShapes(DefaultFillStyle, activeFill);
  }, [editor, activeFill]);

  useEffect(() => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultDashStyle, activeDash);
    editor.setStyleForSelectedShapes(DefaultDashStyle, activeDash);
  }, [editor, activeDash]);

  useEffect(() => {
    if (!editor) return;
    editor.setStyleForNextShapes(GeoShapeGeoStyle, activeGeo);
    editor.setStyleForSelectedShapes(GeoShapeGeoStyle, activeGeo);
  }, [editor, activeGeo]);

  useEffect(() => {
    if (!editor) return;
    editor.setOpacityForNextShapes(opacity);
    editor.setOpacityForSelectedShapes(opacity);
  }, [editor, opacity]);

  // Read styles from selected shapes when selection changes
  useEffect(() => {
    if (!editor) return;
    const cleanup = editor.store.listen(() => {
      const styles = editor.getSharedStyles();
      const color = styles.get(DefaultColorStyle);
      if (color?.type === "shared") setActiveColor(color.value);
      const fill = styles.get(DefaultFillStyle);
      const validFills = FILL_STYLES.map((f) => f.id) as string[];
      if (fill?.type === "shared" && validFills.includes(fill.value))
        setActiveFill(fill.value as (typeof FILL_STYLES)[number]["id"]);
      const dash = styles.get(DefaultDashStyle);
      if (dash?.type === "shared") setActiveDash(dash.value);
      const geo = styles.get(GeoShapeGeoStyle);
      const validGeos = GEO_SHAPES.map((g) => g.id) as string[];
      if (geo?.type === "shared" && validGeos.includes(geo.value))
        setActiveGeo(geo.value as (typeof GEO_SHAPES)[number]["id"]);
      const size = styles.get(DefaultSizeStyle);
      if (size?.type === "shared") setFontSize(size.value as FontSize);
    }, { source: "user", scope: "session" });
    return cleanup;
  }, [editor]);

  // Page navigation
  const goToPage = useCallback(
    (offset: number) => {
      if (!editor) return;
      const pages = editor.getPages();
      const newIdx = pageInfo.currentIndex + offset;
      if (newIdx < 0 || newIdx >= pages.length) return;
      editor.setCurrentPage(pages[newIdx].id);
      syncPages(editor);
    },
    [editor, pageInfo.currentIndex, syncPages]
  );

  const addPage = useCallback(() => {
    if (!editor) return;
    editor.createPage({ name: `Page ${pageInfo.total + 1}` });
    const pages = editor.getPages();
    editor.setCurrentPage(pages[pages.length - 1].id);
    syncPages(editor);
  }, [editor, pageInfo.total, syncPages]);

  const deletePage = useCallback(() => {
    if (!editor || pageInfo.total <= 1) return;
    const currentId = editor.getCurrentPageId();
    const pages = editor.getPages();
    const currentIdx = pages.findIndex((p) => p.id === currentId);
    const targetIdx = currentIdx > 0 ? currentIdx - 1 : 1;
    editor.setCurrentPage(pages[targetIdx].id);
    editor.deletePage(currentId);
    syncPages(editor);
  }, [editor, pageInfo.total, syncPages]);

  // Image upload — delegates to tldraw's built-in handler which uses our asset store
  const handleImageUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    // Delegate to tldraw — it handles asset creation, dimension detection,
    // and shape placement, calling our noteAssetStore.upload() for R2 upload
    editor.putExternalContent({ type: "files", files: [file] });
    e.target.value = "";
  };

  // Active tool tracking
  const [activeTool, setActiveTool] = useState("select");

  // Sync active tool when editor changes tools
  useEffect(() => {
    if (!editor) return;
    const cleanup = editor.store.listen(() => {
      setActiveTool(editor.getCurrentToolId());
    }, { source: "user", scope: "session" });
    return cleanup;
  }, [editor]);

  const isPresetColor = PAPER_COLORS.some((c) => c.value === paperColor);
  const sizeConfig = PAPER_SIZES[paperSize] ?? PAPER_SIZES.a4;


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="flex h-full flex-col"
      >
        {/* Title bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="shrink-0 px-6"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3 py-2">
            <input
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 bg-transparent font-display text-lg font-light text-gray-900 outline-none placeholder:text-gray-900/25 dark:text-white dark:placeholder:text-white/25"
            />

            {/* Page controls */}
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => goToPage(-1)}
                disabled={pageInfo.currentIndex === 0}
                className="rounded-full p-1 text-gray-900/40 transition-colors hover:text-gray-900/70 disabled:opacity-25 dark:text-white/40 dark:hover:text-white/70"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="min-w-[3ch] text-center text-xs tabular-nums text-gray-900/50 dark:text-white/50">
                {pageInfo.currentIndex + 1}/{pageInfo.total}
              </span>
              <button
                onClick={() => goToPage(1)}
                disabled={pageInfo.currentIndex === pageInfo.total - 1}
                className="rounded-full p-1 text-gray-900/40 transition-colors hover:text-gray-900/70 disabled:opacity-25 dark:text-white/40 dark:hover:text-white/70"
              >
                <CaretRight size={14} weight="bold" />
              </button>
              <button
                onClick={addPage}
                className="rounded-full p-1 text-gray-900/40 transition-colors hover:text-gray-900/70 dark:text-white/40 dark:hover:text-white/70"
                title="Add Page"
              >
                <Plus size={14} weight="bold" />
              </button>
              {pageInfo.total > 1 && (
                <button
                  onClick={deletePage}
                  className="rounded-full p-1 text-gray-900/40 transition-colors hover:text-red-500 dark:text-white/40 dark:hover:text-red-400"
                  title="Delete Page"
                >
                  <Trash size={13} weight="duotone" />
                </button>
              )}
            </div>

            <motion.span
              key={saving ? "saving" : "saved"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease }}
              className="shrink-0 text-xs text-gray-900/30 dark:text-white/30"
            >
              {saving ? "Saving..." : "Saved"}
            </motion.span>
          </div>
        </motion.div>

        {/* Toolbar — all tools with dropdowns + paper settings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.15 }}
          className="shrink-0 border-y border-gray-900/5 dark:border-white/5"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-6 py-2 scrollbar-hide">
            {/* Simple tools — no dropdown */}
            {SIMPLE_TOOLS.map((tool) => (
              <ToolBtn
                key={tool.id}
                active={activeTool === tool.id}
                onClick={() => {
                  editor?.setCurrentTool(tool.id);
                  setActiveTool(tool.id);
                  setOpenToolDropdown(null);
                }}
                label={tool.label}
              >
                <tool.icon size={14} weight="duotone" />
              </ToolBtn>
            ))}

            {/* Drawing tools — each has a dropdown with style options */}
            {DRAWING_TOOLS.map((tool) => (
              <Popover
                key={tool.id}
                open={openToolDropdown === tool.id}
                onOpenChange={(open) => {
                  setOpenToolDropdown(open ? tool.id : null);
                  if (open) {
                    editor?.setCurrentTool(tool.id);
                    setActiveTool(tool.id);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    title={tool.label}
                    className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      activeTool === tool.id
                        ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                        : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                    }`}
                  >
                    <tool.icon size={14} weight="duotone" />
                    <CaretDown size={8} weight="bold" className="opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 rounded-2xl border-gray-900/10 bg-white/95 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95"
                  align="start"
                  sideOffset={8}
                >
                  <div className="space-y-3 p-3">
                    {/* Color */}
                    {"hasColor" in tool && tool.hasColor && (
                      <div className="space-y-1.5">
                        <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                          Color
                        </label>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {TLDRAW_COLORS.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setActiveColor(c.id)}
                              className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                                activeColor === c.id
                                  ? "border-gray-900/40 ring-1.5 ring-gray-900/20 dark:border-white/40 dark:ring-white/20"
                                  : "border-gray-900/10 dark:border-white/20"
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Size */}
                    {"hasSize" in tool && tool.hasSize && (
                      <>
                        {"hasColor" in tool && tool.hasColor && <Separator className="bg-gray-900/5 dark:bg-white/5" />}
                        <div className="space-y-1.5">
                          <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                            Size
                          </label>
                          <div className="flex flex-wrap justify-center gap-1">
                            {FONT_SIZES.map((s) => (
                              <button
                                key={s.value}
                                onClick={() => setFontSize(s.value)}
                                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                  fontSize === s.value
                                    ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                                    : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Fill */}
                    {"hasFill" in tool && tool.hasFill && (
                      <>
                        <Separator className="bg-gray-900/5 dark:bg-white/5" />
                        <div className="space-y-1.5">
                          <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                            Fill
                          </label>
                          <div className="flex flex-wrap justify-center gap-1">
                            {FILL_STYLES.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setActiveFill(f.id)}
                                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                  activeFill === f.id
                                    ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                                    : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Stroke */}
                    {"hasStroke" in tool && tool.hasStroke && (
                      <>
                        <Separator className="bg-gray-900/5 dark:bg-white/5" />
                        <div className="space-y-1.5">
                          <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                            Stroke
                          </label>
                          <div className="flex flex-wrap justify-center gap-1">
                            {DASH_STYLES.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => setActiveDash(d.id)}
                                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                  activeDash === d.id
                                    ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                                    : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Opacity */}
                    <Separator className="bg-gray-900/5 dark:bg-white/5" />
                    <div className="space-y-1.5">
                      <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                        Opacity — {Math.round(opacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-900/10 accent-[#5227FF] dark:bg-white/10"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}

            {/* Shape tool — dropdown with shape grid + style options */}
            <Popover
              open={openToolDropdown === "geo"}
              onOpenChange={(open) => {
                setOpenToolDropdown(open ? "geo" : null);
                if (open) {
                  editor?.setCurrentTool("geo");
                  setActiveTool("geo");
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  title="Shape"
                  className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    activeTool === "geo"
                      ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                      : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                  }`}
                >
                  {(() => {
                    const ShapeIcon = GEO_SHAPES.find((s) => s.id === activeGeo)?.icon ?? Rectangle;
                    return <ShapeIcon size={14} weight="duotone" />;
                  })()}
                  <CaretDown size={8} weight="bold" className="opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-56 rounded-2xl border-gray-900/10 bg-white/95 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95"
                align="start"
                sideOffset={8}
              >
                <div className="space-y-3 p-3">
                  {/* Shape picker grid */}
                  <div className="grid grid-cols-5 gap-1">
                    {GEO_SHAPES.map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => setActiveGeo(shape.id)}
                        title={shape.label}
                        className={`flex h-8 w-full items-center justify-center rounded-xl transition-colors ${
                          activeGeo === shape.id
                            ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                            : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                        }`}
                      >
                        <shape.icon size={16} weight="duotone" />
                      </button>
                    ))}
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  {/* Color */}
                  <div className="space-y-1.5">
                    <label className="block text-center text-[10px] font-medium text-gray-900/50 dark:text-white/50">
                      Color
                    </label>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {TLDRAW_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveColor(c.id)}
                          className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                            activeColor === c.id
                              ? "border-gray-900/40 ring-1.5 ring-gray-900/20 dark:border-white/40 dark:ring-white/20"
                              : "border-gray-900/10 dark:border-white/20"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.id}
                        />
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  {/* Size + Fill + Stroke */}
                  <div className="flex flex-wrap justify-center gap-1">
                    {FONT_SIZES.map((s) => (
                      <button key={s.value} onClick={() => setFontSize(s.value)} className={`rounded-full px-3 py-1 text-xs transition-colors ${fontSize === s.value ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{s.label}</button>
                    ))}
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  <div className="flex flex-wrap justify-center gap-1">
                    {FILL_STYLES.map((f) => (
                      <button key={f.id} onClick={() => setActiveFill(f.id)} className={`rounded-full px-2.5 py-1 text-xs transition-colors ${activeFill === f.id ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{f.label}</button>
                    ))}
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  <div className="flex flex-wrap justify-center gap-1">
                    {DASH_STYLES.map((d) => (
                      <button key={d.id} onClick={() => setActiveDash(d.id)} className={`rounded-full px-2.5 py-1 text-xs transition-colors ${activeDash === d.id ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{d.label}</button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

            {/* Undo/Redo */}
            <div className="flex shrink-0 items-center gap-0.5">
              <ToolBtn onClick={() => editor?.undo()} label="Undo">
                <ArrowCounterClockwise size={14} weight="duotone" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.redo()} label="Redo">
                <ArrowClockwise size={14} weight="duotone" />
              </ToolBtn>
            </div>

            <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

            {/* Image upload */}
            <ToolBtn onClick={handleImageUpload} label="Insert Image">
              <ImageSquare size={14} weight="duotone" />
            </ToolBtn>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

            {/* Zoom */}
            <div className="flex shrink-0 items-center gap-0.5">
              <ToolBtn onClick={() => editor?.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 200 } })} label="Zoom In">
                <MagnifyingGlassPlus size={14} weight="duotone" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 200 } })} label="Zoom Out">
                <MagnifyingGlassMinus size={14} weight="duotone" />
              </ToolBtn>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Font */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="shrink-0 rounded-full border border-gray-900/10 bg-gray-900/5 px-3 py-1 text-xs text-gray-900/60 transition-colors hover:bg-gray-900/10 hover:text-gray-900/80 dark:border-white/15 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/80">
                  Font
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 rounded-2xl border-gray-900/10 bg-white/95 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95" align="end" sideOffset={8}>
                <div className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Family</label>
                    <Select value={font} onValueChange={(v) => setFont(v as NoteFont)}>
                      <SelectTrigger className="h-8 w-full rounded-full border-gray-900/10 bg-gray-900/5 text-xs *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-center dark:border-white/15 dark:bg-white/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-center">
                        {NOTE_FONTS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className={`${f.className} justify-center`}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Size</label>
                    <div className="flex flex-wrap justify-center gap-1">
                      {FONT_SIZES.map((s) => (
                        <button key={s.value} onClick={() => setFontSize(s.value)} className={`rounded-full px-3 py-1 text-xs transition-colors ${fontSize === s.value ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Paper */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="shrink-0 rounded-full border border-gray-900/10 bg-gray-900/5 px-3 py-1 text-xs text-gray-900/60 transition-colors hover:bg-gray-900/10 hover:text-gray-900/80 dark:border-white/15 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/80">
                  Paper
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-2xl border-gray-900/10 bg-white/95 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95" align="end" sideOffset={8}>
                <div className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Size</label>
                    <div className="flex flex-wrap justify-center gap-1">
                      {(Object.keys(PAPER_SIZES) as PaperSize[]).map((size) => (
                        <button key={size} onClick={() => setPaperSize(size)} className={`rounded-full px-3 py-1 text-xs transition-colors ${paperSize === size ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{PAPER_SIZES[size].label}</button>
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Style</label>
                    <div className="flex flex-wrap justify-center gap-1">
                      {(Object.keys(PAPER_STYLES) as PaperStyle[]).map((style) => (
                        <button key={style} onClick={() => setPaperStyle(style)} className={`rounded-full px-3 py-1 text-xs transition-colors ${paperStyle === style ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{PAPER_STYLES[style].label}</button>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence>
                    {(paperStyle === "lined" || paperStyle === "grid") && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                        <div className="space-y-1.5">
                          <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Line Alignment</label>
                          <div className="flex flex-wrap justify-center gap-1">
                            {(Object.keys(LINE_ALIGNS) as LineAlign[]).map((align) => (
                              <button key={align} onClick={() => setLineAlign(align)} className={`rounded-full px-3 py-1 text-xs transition-colors ${lineAlign === align ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white" : "text-gray-900/50 hover:bg-gray-900/5 dark:text-white/50 dark:hover:bg-white/5"}`}>{LINE_ALIGNS[align].label}</button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Separator className="bg-gray-900/5 dark:bg-white/5" />
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-medium text-gray-900/50 dark:text-white/50">Color</label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {PAPER_COLORS.map((c) => (
                        <button key={c.value} onClick={() => { setPaperColor(c.value); setCustomColor(c.value); }} className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${paperColor === c.value ? "border-gray-900/40 ring-2 ring-gray-900/20 dark:border-white/40 dark:ring-white/20" : "border-gray-900/10 dark:border-white/20"}`} style={{ backgroundColor: c.value }} title={c.label} />
                      ))}
                      <div className="relative">
                        <input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setPaperColor(e.target.value); }} className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0" />
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] transition-transform hover:scale-110 ${!isPresetColor ? "border-gray-900/40 ring-2 ring-gray-900/20 dark:border-white/40 dark:ring-white/20" : "border-gray-900/10 dark:border-white/20"}`} style={{ backgroundColor: !isPresetColor ? paperColor : undefined }}>
                          {isPresetColor && <span className="text-gray-900/40 dark:text-white/40">+</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        {/* Notebook paper card — tldraw canvas inside, NO SCROLL */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
          <motion.div
            layout
            transition={{ duration: 0.4, ease }}
            className="note-canvas-container relative overflow-hidden rounded-3xl border border-gray-900/[0.06] shadow-[0_2px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] dark:border-white/10 dark:shadow-[0_2px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)]"
            style={{
              width: "100%",
              maxWidth: sizeConfig.width,
              height: "100%",
              maxHeight: `min(100%, ${sizeConfig.height}px)`,
              aspectRatio: `${sizeConfig.width} / ${sizeConfig.height}`,
            }}
          >
            <Tldraw
              snapshot={initialSnapshot}
              onMount={handleMount}
              components={tldrawComponents}
              assets={noteAssetStore}
              options={{ createTextOnCanvasDoubleClick: false }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Hide tldraw's default UI — we use our own toolbar */}
      <style>{`
        .note-canvas-container .tlui-layout { display: none !important; }
        .note-canvas-container .tl-overlays__item { pointer-events: auto; }
      `}</style>
    </>
  );
}

// ==================
// Toolbar button — pill style matching notebook design
// ==================

function ToolBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
          : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}
