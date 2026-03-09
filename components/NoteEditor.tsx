"use client";

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled — tldraw requires browser APIs
const NoteEditorCanvas = dynamic(() => import("./NoteEditorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-gray-900/30 dark:text-white/30">
        Loading editor...
      </span>
    </div>
  ),
});

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string | null;
  initialPaperStyle: string;
  initialPaperColor: string;
  initialPaperSize: string;
  initialLineAlign: string;
  initialFont: string;
}

export function NoteEditor(props: NoteEditorProps) {
  return <NoteEditorCanvas {...props} />;
}
