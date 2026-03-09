"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  NodeResizer,
  NodeToolbar,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type NodeProps,
  type Viewport,
  ReactFlowProvider,
  ConnectionMode,
} from "@xyflow/react";
import { motion } from "framer-motion";
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

// ── Unique node ID ────────────────────────────────────

function createNodeId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Text Card Node ────────────────────────────────────

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

  // Sync external data changes only when not editing
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

      {/* Connection handles — 4 sides, hidden by default, shown on hover via CSS */}
      <Handle type="source" position={Position.Top} id="top" className="canvas-handle" />
      <Handle type="source" position={Position.Right} id="right" className="canvas-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="canvas-handle" />
      <Handle type="source" position={Position.Left} id="left" className="canvas-handle" />

      {/* Card body */}
      <div
        className="canvas-card h-full w-full overflow-hidden rounded-lg transition-shadow"
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
                <span className="text-gray-400 dark:text-white/30">
                  Double-click to edit...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// ── Node types — stable reference, defined outside component ──

const nodeTypes: NodeTypes = { textCard: TextCardNode };

// ── Canvas Inner ──────────────────────────────────────

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
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
    updateMindMap(mindMapId, {
      name: nameRef.current,
      nodes: JSON.stringify(nodesRef.current),
      edges: JSON.stringify(edgesRef.current),
      viewport: JSON.stringify(viewportRef.current),
    }).catch(() => {
      isDirty.current = true;
    });
  }, [mindMapId]);

  const scheduleSave = useCallback(() => {
    isDirty.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 1500);
  }, [flushSave]);

  // Trigger save on state changes — skip initial render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scheduleSave();
  }, [nodes, edges, name, scheduleSave]);

  // Flush pending save on unmount
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

  // ── Connection handler ──────────────────────────────

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          { ...params, type: "default", style: { stroke: "#94a3b8", strokeWidth: 2 } },
          eds
        )
      );
    },
    [setEdges]
  );

  // ── Viewport tracking ──────────────────────────────

  const onMoveEnd = useCallback(
    (_: unknown, vp: Viewport) => {
      viewportRef.current = vp;
      scheduleSave();
    },
    [scheduleSave]
  );

  // ── Double-click on empty canvas → create card ─────

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
    },
    [screenToFlowPosition, setNodes]
  );

  // ── Toolbar: add card at viewport center ────────────

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
  }, [screenToFlowPosition, setNodes]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 400 });
  }, [fitView]);

  const handleNameBlur = useCallback(() => {
    setEditingName(false);
    if (!name.trim()) setName("Untitled");
  }, [name]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="relative flex h-full flex-col"
    >
      {/* Canvas name — top left */}
      <div className="pointer-events-auto absolute left-4 top-3 z-10">
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
            className="h-7 rounded-md border border-gray-900/15 bg-white/90 px-2.5 text-sm font-medium text-gray-900 outline-none backdrop-blur-sm focus:ring-2 focus:ring-gray-900/20 dark:border-white/15 dark:bg-gray-900/90 dark:text-white dark:focus:ring-white/20"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditingName(true);
              setTimeout(() => nameInputRef.current?.focus(), 0);
            }}
            className="rounded-md px-2.5 py-1 text-sm font-medium text-gray-900/60 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {name}
          </button>
        )}
      </div>

      {/* Fit view — top right */}
      <div className="pointer-events-auto absolute right-4 top-3 z-10">
        <button
          onClick={handleFitView}
          className="rounded-md px-2 py-1 text-xs text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900/60 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/60"
          title="Zoom to fit"
        >
          Fit
        </button>
      </div>

      {/* Bottom toolbar — Obsidian style */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-xl border border-gray-200/80 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/95">
          <button
            onClick={handleAddCard}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            + Card
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMoveEnd={onMoveEnd}
          onDoubleClick={onPaneDoubleClick}
          nodeTypes={nodeTypes}
          defaultViewport={initialViewport}
          connectionMode={ConnectionMode.Loose}
          fitView={initialNodes.length > 0}
          fitViewOptions={{ padding: 0.4 }}
          deleteKeyCode={["Backspace", "Delete"]}
          zoomOnDoubleClick={false}
          snapToGrid
          snapGrid={[20, 20]}
          panActivationKeyCode="Space"
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Meta"
          minZoom={0.1}
          maxZoom={4}
          proOptions={{ hideAttribution: true }}
          className="canvas-flow"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="!bg-white dark:!bg-[var(--background)]"
          />
        </ReactFlow>
      </div>
    </motion.div>
  );
}

// ── Exported wrapper ──────────────────────────────────

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

  return (
    <ReactFlowProvider>
      <MindMapCanvasInner
        mindMapId={mindMapId}
        initialName={name}
        initialNodes={typedNodes}
        initialEdges={parsedEdges}
        initialViewport={parsedViewport}
      />
    </ReactFlowProvider>
  );
}
