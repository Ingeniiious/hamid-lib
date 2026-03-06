import { Skeleton } from "@/components/ui/skeleton";

export default function UserDetailLoading() {
  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-28 rounded-2xl bg-gray-900/5 dark:bg-white/5" />

      {/* User card skeleton */}
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full bg-gray-900/5 dark:bg-white/5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
            <Skeleton className="h-4 w-56 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
            <Skeleton className="h-3 w-24 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-9 w-48 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
        <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
                <Skeleton className="h-4 w-32 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
