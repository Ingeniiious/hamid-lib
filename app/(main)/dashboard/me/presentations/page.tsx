import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { PresentationsList } from "@/components/portal/PresentationsList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presentations",
  robots: { index: false },
};

export default function PresentationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-12">
      <div className="sticky top-0 z-10">
        <BackButton href="/dashboard/me" label="My Studies" />
      </div>

      <PageHeader
        title="Presentations"
        subtitle="Upload files and share them instantly via Portal."
      />

      <div className="mt-8">
        <PresentationsList />
      </div>
    </div>
  );
}
