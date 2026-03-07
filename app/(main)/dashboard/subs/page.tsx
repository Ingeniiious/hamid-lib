import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { SubsCard } from "./SubsCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription",
  description: "Manage your Libraryyy subscription plan and billing.",
};

export default function SubscriptionPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title="Subscription"
          subtitle="Manage your plan and billing."
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <SubsCard />
        <p className="mt-6 text-xs text-gray-900/30 dark:text-white/30">
          Premium plans coming soon.
        </p>
      </div>

      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
