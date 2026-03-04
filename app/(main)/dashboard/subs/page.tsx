import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription",
  robots: { index: false },
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
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-gray-900/10 bg-white/50 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
          <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
            Free Plan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-900/50 dark:text-white/50">
            You&apos;re currently on the free plan. All courses, materials, and
            features are available to you at no cost.
          </p>
          <div className="mt-6 inline-flex items-baseline gap-1">
            <span className="font-display text-4xl font-light text-gray-900 dark:text-white">
              $0
            </span>
            <span className="text-sm text-gray-900/40 dark:text-white/40">
              / month
            </span>
          </div>
          <div className="mt-6 space-y-2 text-left text-sm text-gray-900/60 dark:text-white/60">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              All Courses
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Presentations
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Exam Practice
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">&#10003;</span>
              Portal File Sharing
            </div>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-900/30 dark:text-white/30">
          Premium plans coming soon.
        </p>
      </div>

      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
