import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContributeLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title="Contribute" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-24">
        <div className="mx-auto max-w-md pt-8">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
