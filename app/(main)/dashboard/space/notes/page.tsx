import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";
import { NotesExplorer } from "@/components/NotesExplorer";
import { getUserNotes, getUserFolders, getFolderBreadcrumbs } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notes",
  description: "Create notes with custom paper styles, sizes, and textures.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder: folderId } = await searchParams;

  const [notes, folders, breadcrumbs] = await Promise.all([
    getUserNotes(folderId || null),
    getUserFolders(folderId || null),
    folderId ? getFolderBreadcrumbs(folderId) : Promise.resolve([]),
  ]);

  const backHref = breadcrumbs.length > 1
    ? `/dashboard/space/notes?folder=${breadcrumbs[breadcrumbs.length - 2].id}`
    : "/dashboard/space/notes";

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={folderId && breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : "Notes"}
          subtitle={!folderId ? "Create and organize your notes" : undefined}
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          <NotesExplorer
            notes={notes}
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
