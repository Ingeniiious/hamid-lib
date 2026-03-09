"use client";

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled — React Flow requires browser APIs
const MindMapCanvas = dynamic(
  () => import("./MindMapCanvas").then((mod) => ({ default: mod.MindMapCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-gray-900/30 dark:text-white/30">
          Loading editor...
        </span>
      </div>
    ),
  }
);

interface MindMapEditorProps {
  mindMapId: string;
  name: string;
  nodes: string | null;
  edges: string | null;
  viewport: string | null;
}

export function MindMapEditor(props: MindMapEditorProps) {
  return <MindMapCanvas {...props} />;
}
