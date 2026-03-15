import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Page header skeleton */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <div className="pb-2 pt-4 text-center">
          <Skeleton className="mx-auto h-9 w-40 rounded-lg bg-gray-900/10 dark:bg-white/10" />
          <Skeleton className="mx-auto mt-3 h-4 w-56 rounded-lg bg-gray-900/10 dark:bg-white/10" />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          {/* Course card grid skeleton */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] overflow-hidden rounded-[2rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl sm:aspect-square sm:rounded-[3rem] dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex h-full flex-col items-center justify-center p-5 sm:p-8">
                  <Skeleton className="h-6 w-2/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
                  <Skeleton className="mt-3 h-4 w-1/2 rounded-lg bg-gray-900/10 dark:bg-white/10" />
                  <Skeleton className="mt-2 h-3 w-1/3 rounded-lg bg-gray-900/10 dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
