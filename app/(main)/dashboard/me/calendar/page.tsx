import { BackButton } from "@/components/BackButton";
import { TranslatedPageHeader } from "@/components/TranslatedPageHeader";
import { CalendarView } from "@/components/CalendarView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Your study calendar and upcoming events.",
};

export default function CalendarPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <TranslatedPageHeader
          titleKey="calendar.pageTitle"
          subtitleKey="calendar.pageSubtitle"
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
