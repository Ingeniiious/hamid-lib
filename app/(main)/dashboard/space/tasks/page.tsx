import { BackButton } from "@/components/BackButton";
import { TranslatedPageHeader } from "@/components/TranslatedPageHeader";
import { TaskView } from "@/components/TaskView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Track your homework and to-do items.",
};

export default function TasksPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <TranslatedPageHeader
          titleKey="tasks.pageTitle"
          subtitleKey="tasks.pageSubtitle"
        />
      </div>

      {/* Task list fills remaining height */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <TaskView />
      </div>
      <BackButton href="/dashboard/space" label="My Space" floating />
    </div>
  );
}
