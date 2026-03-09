import { BackButton } from "@/components/BackButton";
import { MindMapCanvas } from "@/components/MindMapCanvas";
import { getMindMap } from "../actions";
import { redirect } from "next/navigation";
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

  if (!mindMap) {
    redirect("/dashboard/space/mindmap");
  }

  return (
    <div className="relative flex h-full flex-col">
      <MindMapCanvas
        mindMapId={mindMap.id}
        name={mindMap.name}
        nodes={mindMap.nodes}
        edges={mindMap.edges}
        viewport={mindMap.viewport}
      />
      <BackButton
        href={mindMap.folderId ? `/dashboard/space/mindmap?folder=${mindMap.folderId}` : "/dashboard/space/mindmap"}
        label="Mind Maps"
        floating
      />
    </div>
  );
}
