import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Track your homework and to-do items.",
};

export default function TasksPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title="Tasks" subtitle="Coming soon" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-24">
        <p className="text-center text-gray-900/40 dark:text-white/40">
          Keep track of your homework, deadlines, and to-do items.
        </p>
      </div>
      <BackButton href="/dashboard/space" label="My Space" floating />
    </div>
  );
}
