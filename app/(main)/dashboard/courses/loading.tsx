import { Skeleton } from "@/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div
      className="mx-auto max-w-5xl px-6 pb-12 opacity-0"
      style={{ animation: "skeleton-delay 0.4s ease 5s forwards" }}
    >
      {/* Back button skeleton */}
      <div className="pb-2 pt-4">
        <Skeleton className="mx-auto h-5 w-24 rounded-full bg-gray-900/10 dark:bg-white/10" />
      </div>

      {/* Page header skeleton */}
      <div className="pb-4 pt-6 text-center sm:pb-20 sm:pt-10">
        <Skeleton className="mx-auto h-8 w-40 rounded-lg bg-gray-900/10 sm:h-10 dark:bg-white/10" />
        <Skeleton className="mx-auto mt-3 h-4 w-32 rounded-lg bg-gray-900/10 dark:bg-white/10" />
      </div>

      {/* Faculty cards grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] overflow-hidden rounded-[2rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl sm:aspect-square sm:rounded-[3rem] dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8">
              <Skeleton className="h-24 w-24 rounded-2xl bg-gray-900/10 sm:h-32 sm:w-32 dark:bg-white/10" />
              <Skeleton className="mt-4 h-5 w-2/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
              <Skeleton className="mt-2 h-4 w-1/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
