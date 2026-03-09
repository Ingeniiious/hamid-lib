import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { MindMapEditor } from "@/components/MindMapEditor";
import { getMindMap } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mind Map Editor",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MindMapEditorPage({
  params,
}: {
  params: Promise<{ mindmapId: string }>;
}) {
  const { mindmapId } = await params;
  const mindMap = await getMindMap(mindmapId);

  if (!mindMap) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <MindMapEditor
          mindMapId={mindMap.id}
          name={mindMap.name}
          nodes={mindMap.nodes}
          edges={mindMap.edges}
          viewport={mindMap.viewport}
        />
      </div>
      <BackButton
        href={mindMap.folderId ? `/dashboard/space/mindmap?folder=${mindMap.folderId}` : "/dashboard/space/mindmap"}
        label="Mind Maps"
        floating
      />
    </div>
  );
}
