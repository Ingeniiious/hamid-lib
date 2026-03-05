"use client";

import { NotificationPrompt } from "@/components/NotificationPrompt";

export function DashboardNotificationPrompt() {
  return (
    <div className="mx-auto w-full max-w-[340px] sm:max-w-3xl">
      <NotificationPrompt context="dashboard" />
    </div>
  );
}
