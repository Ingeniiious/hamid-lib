import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { MindMapExplorer } from "@/components/MindMapExplorer";
import { getUserMindMaps, getUserMindMapFolders, getMindMapFolderBreadcrumbs } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mind Map",
  description: "Create mind maps and connect your ideas visually.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MindMapPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder: folderId } = await searchParams;

  const [mindMaps, folders, breadcrumbs] = await Promise.all([
    getUserMindMaps(folderId || null),
    getUserMindMapFolders(folderId || null),
    folderId ? getMindMapFolderBreadcrumbs(folderId) : Promise.resolve([]),
  ]);

  const backHref = breadcrumbs.length > 1
    ? `/dashboard/space/mindmap?folder=${breadcrumbs[breadcrumbs.length - 2].id}`
    : "/dashboard/space/mindmap";

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={folderId && breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : "Mind Map"}
          subtitle={!folderId ? "Create and connect your ideas" : undefined}
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          <MindMapExplorer
            mindMaps={mindMaps}
            folders={folders}
            breadcrumbs={breadcrumbs}
            currentFolderId={folderId || null}
          />
        </div>
      </div>
      <BackButton
        href={folderId ? backHref : "/dashboard/space"}
        label={folderId ? "Back" : "My Space"}
        floating
      />
    </div>
  );
}
