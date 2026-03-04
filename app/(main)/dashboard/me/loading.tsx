import { Skeleton } from "@/components/ui/skeleton";

export default function MyStudiesLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        {/* BackButton skeleton */}
        <div className="pt-6 sm:pt-8">
          <Skeleton className="h-5 w-24 bg-gray-900/10 dark:bg-white/10" />
        </div>
        {/* PageHeader skeleton */}
        <div className="pb-2 pt-4">
          <Skeleton className="h-9 w-36 bg-gray-900/10 dark:bg-white/10" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-4 sm:pb-6">
        <div className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 sm:gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="aspect-[4/3] overflow-hidden rounded-[2rem] border border-gray-900/10 bg-white/50 backdrop-blur-xl sm:aspect-square sm:rounded-[3rem] dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8">
                <Skeleton className="w-1/2 aspect-square rounded-xl bg-gray-900/10 sm:w-3/4 dark:bg-white/10" />
                <Skeleton className="mx-auto mt-3 h-7 w-2/3 bg-gray-900/10 sm:mt-5 dark:bg-white/10" />
                <Skeleton className="mx-auto mt-1.5 h-4 w-1/2 bg-gray-900/10 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
