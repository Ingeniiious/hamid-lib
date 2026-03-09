"use client";

import { SpaceCard } from "@/components/SpaceCard";

export function SpaceCardGrid() {
  return (
    <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 pt-8 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 sm:pt-0 lg:max-w-5xl lg:grid-cols-3">
      <SpaceCard
        title="Notes"
        description="Write on custom paper"
        href="/dashboard/space/notes"
        image="https://lib.thevibecodedcompany.com/images/my-notes.webp"
        index={0}
      />
      <SpaceCard
        title="Mind Map"
        description="Connect your ideas"
        href="/dashboard/space/mindmap"
        image="https://lib.thevibecodedcompany.com/images/my-mindmap.webp"
        index={1}
      />
      <SpaceCard
        title="Tasks"
        description="Track your homework"
        href="/dashboard/space/tasks"
        image="https://lib.thevibecodedcompany.com/images/my-tasks.webp"
        index={2}
      />
    </div>
  );
}
