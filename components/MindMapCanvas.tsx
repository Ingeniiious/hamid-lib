"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  NodeResizer,
  NodeToolbar,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type EdgeProps,
  type Viewport,
  ReactFlowProvider,
  ConnectionMode,
} from "@xyflow/react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Cursor,
  Hand,
  Plus,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  DotsNine,
  GridFour,
  Crosshair,
  Rectangle,
  CaretDown,
} from "@phosphor-icons/react";
import { updateMindMap } from "@/app/(main)/dashboard/space/mindmap/actions";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const ease = EASE as unknown as [number, number, number, number];

// ── Obsidian-style 6 preset colors ────────────────────

const CARD_COLORS = [
  { label: "Red", value: "#FB464C" },
  { label: "Orange", value: "#E9973F" },
  { label: "Yellow", value: "#E0DE71" },
  { label: "Green", value: "#44CF6E" },
  { label: "Cyan", value: "#53DFDD" },
  { label: "Purple", value: "#A882FF" },
] as const;

const DEFAULT_CARD_WIDTH = 260;
const DEFAULT_CARD_HEIGHT = 160;
const MAX_HISTORY = 50;

const DEFAULT_EDGE_STYLE = { stroke: "#94a3b8", strokeWidth: 2 };
const SELECTED_EDGE_COLOR = "#5227FF";
const ARROW_MARKER = {
  type: MarkerType.ArrowClosed as const,
  width: 16,
  height: 16,
  color: "#94a3b8",
};

const BG_VARIANTS = [
  { label: "Dots", value: BackgroundVariant.Dots, icon: DotsNine },
  { label: "Lines", value: BackgroundVariant.Lines, icon: GridFour },
  { label: "Cross", value: BackgroundVariant.Cross, icon: Crosshair },
  { label: "None", value: null, icon: Rectangle },
] as const;

// ── Unique node ID ────────────────────────────────────

function createNodeId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ══════════════════════════════════════════════════════
// TEXT CARD NODE
// ══════════════════════════════════════════════════════

type TextCardData = { text: string; color?: string | null };
type TextCardType = Node<TextCardData, "textCard">;

const TextCardNode = memo(function TextCardNode({
  id,
  data,
  selected,
}: NodeProps<TextCardType>) {
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const color = data.color || null;

  useEffect(() => {
    if (!editing) setLocalText(data.text);
  }, [data.text, editing]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }, []);

  const commitEdit = useCallback(() => {
    setEditing(false);
    updateNodeData(id, { text: localText });
  }, [id, localText, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocalText(data.text);
        setEditing(false);
      }
    },
    [data.text]
  );

  const setColor = useCallback(
    (c: string | null) => updateNodeData(id, { color: c }),
    [id, updateNodeData]
  );

  const borderColor = color
    ? `${color}60`
    : selected
      ? "rgba(82,39,255,0.5)"
      : "rgba(128,128,128,0.15)";

  return (
    <>
      <NodeResizer
        minWidth={140}
        minHeight={60}
        isVisible={!!selected}
        lineClassName="!border-transparent"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-gray-400/60 !bg-white dark:!border-gray-500/60 dark:!bg-gray-800"
      />

      <NodeToolbar position={Position.Top} offset={8} align="center">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200/80 bg-white px-1.5 py-1 shadow-md dark:border-white/10 dark:bg-gray-900">
          {CARD_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(color === c.value ? null : c.value)}
              className={`h-4.5 w-4.5 rounded-full transition-transform hover:scale-125 ${
                color === c.value
                  ? "ring-2 ring-gray-900/30 ring-offset-1 dark:ring-white/40 dark:ring-offset-gray-900"
                  : ""
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          <div className="mx-0.5 h-4 w-px bg-gray-200 dark:bg-white/10" />
          <button
            onClick={() => setColor(null)}
            className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-gray-300/60 text-[8px] text-gray-400 transition-transform hover:scale-125 dark:border-white/20 dark:text-white/40"
            title="No color"
          >
            ×
          </button>
        </div>
      </NodeToolbar>

      <Handle type="source" position={Position.Top} id="top" className="canvas-handle" />
      <Handle type="source" position={Position.Right} id="right" className="canvas-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="canvas-handle" />
      <Handle type="source" position={Position.Left} id="left" className="canvas-handle" />

      <div
        className="canvas-card h-full w-full cursor-text overflow-hidden rounded-lg transition-shadow"
        style={{
          border: `${color ? "2px" : "1px"} solid ${borderColor}`,
          backgroundColor: color ? `${color}0a` : undefined,
          boxShadow: selected
            ? "0 4px 16px rgba(0,0,0,0.1)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        }}
        onDoubleClick={startEditing}
      >
        {color && <div className="h-1 w-full" style={{ backgroundColor: color }} />}
        <div className="h-full p-3">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="nodrag nowheel h-full w-full resize-none bg-transparent text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-white/30"
              placeholder="Type something..."
            />
          ) : (
            <div className="h-full select-none whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-white">
              {data.text || (
                <span className="italic text-gray-300 dark:text-white/20">
                  Double-click to edit
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// ══════════════════════════════════════════════════════
// LABELED EDGE — editable labels + arrow markers
// ══════════════════════════════════════════════════════

type LabeledEdgeData = { label?: string };
type LabeledEdgeType = Edge<LabeledEdgeData, "labeled">;

const LabeledEdge = memo(function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps<LabeledEdgeType>) {
  const { setEdges } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data?.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocalLabel(data?.label || "");
  }, [data?.label, editing]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const commitLabel = useCallback(() => {
    setEditing(false);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label: localLabel } } : e
      )
    );
  }, [id, localLabel, setEdges]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? SELECTED_EDGE_COLOR : (style?.stroke ?? DEFAULT_EDGE_STYLE.stroke),
          strokeWidth: style?.strokeWidth ?? DEFAULT_EDGE_STYLE.strokeWidth,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={startEditing}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") inputRef.current?.blur();
                if (e.key === "Escape") {
                  setLocalLabel(data?.label || "");
                  setEditing(false);
                }
              }}
              className="h-6 w-28 rounded-full border border-gray-900/20 bg-white/95 px-2.5 text-center text-[11px] text-gray-900 outline-none backdrop-blur-sm focus:ring-2 focus:ring-[#5227FF]/30 dark:border-white/20 dark:bg-gray-900/95 dark:text-white"
              placeholder="Label..."
              autoFocus
            />
          ) : localLabel ? (
            <span className="cursor-pointer rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-gray-900/90 dark:text-white/80 dark:hover:bg-gray-900">
              {localLabel}
            </span>
          ) : selected ? (
            <span className="cursor-pointer rounded-full bg-white/60 px-2 py-0.5 text-[10px] text-gray-400 backdrop-blur-sm dark:bg-gray-900/60 dark:text-white/30">
              Double-click to label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// ── Type registries — stable references ───────────────

const nodeTypes: NodeTypes = { textCard: TextCardNode };
const edgeTypes: EdgeTypes = { labeled: LabeledEdge };

// ── Toolbar button ────────────────────────────────────

function ToolBtn({
  children,
  active,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed text-gray-900/20 dark:text-white/20"
          : active
            ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
            : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

// ── History entry ─────────────────────────────────────

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

// ══════════════════════════════════════════════════════
// CANVAS INNER
// ══════════════════════════════════════════════════════

interface CanvasInnerProps {
  mindMapId: string;
  initialName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport: Viewport;
}

function MindMapCanvasInner({
  mindMapId,
  initialName,
  initialNodes,
  initialEdges,
  initialViewport,
}: CanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const {
    screenToFlowPosition,
    fitView,
    zoomIn,
    zoomOut,
    getZoom,
    deleteElements,
    getNodes,
    getEdges,
  } = useReactFlow();

  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTool, setActiveTool] = useState<"select" | "pan">("select");
  const [bgVariant, setBgVariant] = useState<BackgroundVariant | null>(BackgroundVariant.Dots);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── History (undo/redo) ─────────────────────────────

  const historyRef = useRef<HistoryEntry[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);
  // Force re-render for canUndo/canRedo
  const [, forceRender] = useState(0);

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(getNodes())),
      edges: JSON.parse(JSON.stringify(getEdges())),
    };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(entry);
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    forceRender((n) => n + 1);
  }, [getNodes, getEdges]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(entry.nodes)));
    setEdges(JSON.parse(JSON.stringify(entry.edges)));
    forceRender((n) => n + 1);
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(entry.nodes)));
    setEdges(JSON.parse(JSON.stringify(entry.edges)));
    forceRender((n) => n + 1);
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, [setNodes, setEdges]);

  // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // ── Save infrastructure ─────────────────────────────

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const nameRef = useRef(name);
  const viewportRef = useRef(initialViewport);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isDirty = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { nameRef.current = name; }, [name]);

  const flushSave = useCallback(() => {
    if (!isDirty.current) return;
    isDirty.current = false;
    setSaving(true);
    updateMindMap(mindMapId, {
      name: nameRef.current,
      nodes: JSON.stringify(nodesRef.current),
      edges: JSON.stringify(edgesRef.current),
      viewport: JSON.stringify(viewportRef.current),
    })
      .then(() => setSaving(false))
      .catch(() => {
        isDirty.current = true;
        setSaving(false);
      });
  }, [mindMapId]);

  const scheduleSave = useCallback(() => {
    isDirty.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 1500);
  }, [flushSave]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scheduleSave();
  }, [nodes, edges, name, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (isDirty.current) {
        updateMindMap(mindMapId, {
          name: nameRef.current,
          nodes: JSON.stringify(nodesRef.current),
          edges: JSON.stringify(edgesRef.current),
          viewport: JSON.stringify(viewportRef.current),
        }).catch(() => {});
      }
    };
  }, [mindMapId]);

  // ── Connections ─────────────────────────────────────

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "labeled",
            data: { label: "" },
            markerEnd: ARROW_MARKER,
          },
          eds
        )
      );
      setTimeout(pushHistory, 0);
    },
    [setEdges, pushHistory]
  );

  // Edge reconnection — drag edge endpoint to a different node
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      setTimeout(pushHistory, 0);
    },
    [setEdges, pushHistory]
  );

  // ── Viewport tracking ──────────────────────────────

  const onMoveEnd = useCallback(
    (_: unknown, vp: Viewport) => {
      viewportRef.current = vp;
      setZoomLevel(vp.zoom);
      scheduleSave();
    },
    [scheduleSave]
  );

  // ── History triggers ───────────────────────────────

  const onNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onDelete = useCallback(() => {
    setTimeout(pushHistory, 0);
  }, [pushHistory]);

  // ── Double-click on pane → create card ─────────────

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      position.x -= DEFAULT_CARD_WIDTH / 2;
      position.y -= DEFAULT_CARD_HEIGHT / 2;

      setNodes((nds) => [
        ...nds,
        {
          id: createNodeId(),
          type: "textCard",
          position,
          data: { text: "", color: null },
          style: { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT },
        },
      ]);
      setTimeout(pushHistory, 0);
    },
    [screenToFlowPosition, setNodes, pushHistory]
  );

  // ── Toolbar actions ─────────────────────────────────

  const handleAddCard = useCallback(() => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    position.x -= DEFAULT_CARD_WIDTH / 2;
    position.y -= DEFAULT_CARD_HEIGHT / 2;

    setNodes((nds) => [
      ...nds,
      {
        id: createNodeId(),
        type: "textCard",
        position,
        data: { text: "", color: null },
        style: { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT },
      },
    ]);
    setTimeout(pushHistory, 0);
  }, [screenToFlowPosition, setNodes, pushHistory]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 400 });
  }, [fitView]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    setTimeout(pushHistory, 0);
  }, [getNodes, getEdges, deleteElements, pushHistory]);

  const handleNameBlur = useCallback(() => {
    setEditingName(false);
    if (!name.trim()) setName("Untitled");
  }, [name]);

  useEffect(() => {
    setZoomLevel(getZoom());
  }, [getZoom]);

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="flex h-full flex-col"
    >
      {/* ── Title bar ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.1 }}
        className="shrink-0 px-6"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 py-2">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") nameInputRef.current?.blur();
                if (e.key === "Escape") {
                  setName(initialName);
                  setEditingName(false);
                }
              }}
              className="flex-1 bg-transparent font-display text-lg font-light text-gray-900 outline-none placeholder:text-gray-900/25 dark:text-white dark:placeholder:text-white/25"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditingName(true);
                setTimeout(() => nameInputRef.current?.focus(), 0);
              }}
              className="flex-1 text-left font-display text-lg font-light text-gray-900 transition-colors hover:text-gray-900/70 dark:text-white dark:hover:text-white/70"
            >
              {name}
            </button>
          )}

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

      {/* ── Toolbar ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease, delay: 0.15 }}
        className="shrink-0 border-y border-gray-900/5 dark:border-white/5"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-6 py-2 scrollbar-hide">
          {/* Select / Pan */}
          <ToolBtn active={activeTool === "select"} onClick={() => setActiveTool("select")} label="Select (V)">
            <Cursor size={14} weight="duotone" />
          </ToolBtn>
          <ToolBtn active={activeTool === "pan"} onClick={() => setActiveTool("pan")} label="Pan (Space + drag)">
            <Hand size={14} weight="duotone" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

          {/* Add card */}
          <ToolBtn onClick={handleAddCard} label="Add Card">
            <Plus size={14} weight="bold" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

          {/* Undo / Redo */}
          <ToolBtn onClick={undo} disabled={!canUndo} label="Undo (⌘Z)">
            <ArrowCounterClockwise size={14} weight="duotone" />
          </ToolBtn>
          <ToolBtn onClick={redo} disabled={!canRedo} label="Redo (⌘⇧Z)">
            <ArrowClockwise size={14} weight="duotone" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

          {/* Delete */}
          <ToolBtn onClick={handleDeleteSelected} label="Delete Selected (⌫)">
            <Trash size={14} weight="duotone" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-4 shrink-0 bg-gray-900/10 dark:bg-white/10" />

          {/* Zoom */}
          <ToolBtn disabled={zoomLevel <= 0.1} onClick={handleZoomOut} label="Zoom Out">
            <MagnifyingGlassMinus size={14} weight="duotone" />
          </ToolBtn>
          <button
            onClick={handleFitView}
            className="min-w-[4ch] rounded-full px-2 py-1 text-center text-xs tabular-nums text-gray-900/50 transition-colors hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
            title="Fit to view"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <ToolBtn disabled={zoomLevel >= 4} onClick={handleZoomIn} label="Zoom In">
            <MagnifyingGlassPlus size={14} weight="duotone" />
          </ToolBtn>

          <div className="flex-1" />

          {/* Background */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-900/10 bg-gray-900/5 px-3 py-1 text-xs text-gray-900/60 transition-colors hover:bg-gray-900/10 hover:text-gray-900/80 dark:border-white/15 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/80">
                Grid
                <CaretDown size={8} weight="bold" className="opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-44 rounded-2xl border-gray-900/10 bg-white/95 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95"
              align="end"
              sideOffset={8}
            >
              <div className="space-y-1 p-2">
                {BG_VARIANTS.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => setBgVariant(v.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      bgVariant === v.value
                        ? "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white"
                        : "text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900/70 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70"
                    }`}
                  >
                    <v.icon size={14} weight="duotone" />
                    {v.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* ── Canvas container ─────────────────────────── */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-gray-900/[0.06] shadow-[0_2px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] dark:border-white/10 dark:shadow-[0_2px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onMoveEnd={onMoveEnd}
            onNodeDragStop={onNodeDragStop}
            onDelete={onDelete}
            onDoubleClick={onPaneDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={initialViewport}
            defaultEdgeOptions={{
              type: "labeled",
              markerEnd: ARROW_MARKER,
              data: { label: "" },
            }}
            connectionMode={ConnectionMode.Loose}
            edgesReconnectable
            fitView={initialNodes.length > 0}
            fitViewOptions={{ padding: 0.4 }}
            deleteKeyCode={["Backspace", "Delete"]}
            zoomOnDoubleClick={false}
            snapToGrid
            snapGrid={[20, 20]}
            panActivationKeyCode="Space"
            panOnDrag={activeTool === "pan" ? true : [1, 2]}
            selectionOnDrag={activeTool === "select"}
            selectionKeyCode={activeTool === "select" ? null : "Shift"}
            multiSelectionKeyCode="Meta"
            minZoom={0.1}
            maxZoom={4}
            proOptions={{ hideAttribution: true }}
            className="canvas-flow"
          >
            {bgVariant !== null ? (
              <Background
                variant={bgVariant}
                gap={20}
                size={bgVariant === BackgroundVariant.Cross ? 6 : 1}
                className="!bg-white dark:!bg-[var(--background)]"
              />
            ) : (
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={0}
                className="!bg-white dark:!bg-[var(--background)]"
              />
            )}
            <MiniMap
              nodeColor={(n) => {
                const c = (n.data as TextCardData)?.color;
                return c || "#e2e8f0";
              }}
              maskColor="rgba(0,0,0,0.08)"
              className="!bottom-4 !right-4 !rounded-xl !border !border-gray-900/10 !bg-white/90 !shadow-md dark:!border-white/10 dark:!bg-gray-900/90"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════
// EXPORTED WRAPPER
// ══════════════════════════════════════════════════════

interface MindMapCanvasProps {
  mindMapId: string;
  name: string;
  nodes: string | null;
  edges: string | null;
  viewport: string | null;
}

export function MindMapCanvas({
  mindMapId,
  name,
  nodes,
  edges,
  viewport,
}: MindMapCanvasProps) {
  const parsedNodes: Node[] = (() => {
    try {
      return nodes ? JSON.parse(nodes) : [];
    } catch {
      return [];
    }
  })();

  const parsedEdges: Edge[] = (() => {
    try {
      return edges ? JSON.parse(edges) : [];
    } catch {
      return [];
    }
  })();

  const parsedViewport: Viewport = (() => {
    try {
      return viewport ? JSON.parse(viewport) : { x: 0, y: 0, zoom: 1 };
    } catch {
      return { x: 0, y: 0, zoom: 1 };
    }
  })();

  const typedNodes = parsedNodes.map((n) => ({
    ...n,
    type: n.type || "textCard",
    style: n.style || { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT },
  }));

  // Ensure all edges have the labeled type + arrow marker
  const typedEdges = parsedEdges.map((e) => ({
    ...e,
    type: e.type || "labeled",
    markerEnd: e.markerEnd || ARROW_MARKER,
    data: e.data || { label: "" },
  }));

  return (
    <ReactFlowProvider>
      <MindMapCanvasInner
        mindMapId={mindMapId}
        initialName={name}
        initialNodes={typedNodes}
        initialEdges={typedEdges}
        initialViewport={parsedViewport}
      />
    </ReactFlowProvider>
  );
}
