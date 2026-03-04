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
    <div className="flex h-full flex-col">
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title="Presentations"
          subtitle="Upload files and share them instantly via Portal."
        />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          <PresentationsList />
        </div>
      </div>
      <BackButton href="/dashboard/me" label="My Studies" floating />
    </div>
  );
}
