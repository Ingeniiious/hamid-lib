import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="h-32 rounded-2xl bg-gray-900/5 dark:bg-white/5"
          />
        ))}
      </div>
      {/* Content area */}
      <Skeleton className="h-64 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
    </div>
  );
}
