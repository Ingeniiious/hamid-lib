import { BackButton } from "@/components/BackButton";
import { TranslatedPageHeader } from "@/components/TranslatedPageHeader";
import { SpaceCardGrid } from "./SpaceCardGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Space",
  description: "Your personal workspace — notes, mind maps, and tasks.",
};

export default function MySpacePage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header — stays pinned */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <TranslatedPageHeader titleKey="dashboard.mySpace" />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 sm:flex sm:items-center sm:justify-center"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <SpaceCardGrid />
      </div>
      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
