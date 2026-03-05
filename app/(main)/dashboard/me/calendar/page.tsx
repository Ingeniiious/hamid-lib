import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { CalendarView } from "@/components/CalendarView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  robots: { index: false },
};

export default function CalendarPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title="Calendar"
          subtitle="Your schedules, exams, and deadlines."
        />
      </div>

      {/* Calendar fills remaining height — no page scroll */}
      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto h-full max-w-5xl">
          <CalendarView />
        </div>
      </div>
      <BackButton href="/dashboard/me" label="My Studies" floating />
    </div>
  );
}
