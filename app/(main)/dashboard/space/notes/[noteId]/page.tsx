import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { NoteEditor } from "@/components/NoteEditor";
import { getNote } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Note",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NoteEditorPage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  const note = await getNote(noteId);

  if (!note) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <NoteEditor
          noteId={note.id}
          initialTitle={note.title}
          initialContent={note.content}
          initialPaperStyle={note.paperStyle}
          initialPaperColor={note.paperColor}
          initialPaperSize={note.paperSize}
          initialLineAlign={note.lineAlign}
          initialFont={note.font}
        />
      </div>
      <BackButton href="/dashboard/space/notes" label="Notes" floating />
    </div>
  );
}
