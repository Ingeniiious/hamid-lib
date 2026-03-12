"use client";

import { SpaceCard } from "@/components/SpaceCard";
import { useTranslation } from "@/lib/i18n";

export function SpaceCardGrid() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 pt-8 sm:max-w-3xl sm:grid-cols-2 sm:gap-6 sm:pt-0 lg:max-w-5xl lg:grid-cols-3">
      <SpaceCard
        title={t("space.notes")}
        description={t("space.writeOnPaper")}
        href="/dashboard/space/notes"
        image="https://lib.thevibecodedcompany.com/images/my-notes.webp"
        index={0}
      />
      <SpaceCard
        title={t("space.mindMap")}
        description={t("space.connectIdeas")}
        href="/dashboard/space/mindmap"
        image="https://lib.thevibecodedcompany.com/images/my-mindmap.webp"
        index={1}
      />
      <SpaceCard
        title={t("space.tasks")}
        description={t("space.trackHomework")}
        href="/dashboard/space/tasks"
        image="https://lib.thevibecodedcompany.com/images/my-tasks.webp"
        index={2}
      />
    </div>
  );
}
