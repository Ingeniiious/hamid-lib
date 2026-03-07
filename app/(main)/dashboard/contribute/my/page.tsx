import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";
import { ContributionCard } from "@/components/ContributionCard";
import { getMyContributions } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Contributions",
  description: "View and track the status of your submitted contributions.",
};

export default async function MyContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10));
  const { contributions, total } = await getMyContributions(page, 10);
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title="My Contributions"
          subtitle={`${total} ${total === 1 ? "Contribution" : "Contributions"}`}
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-2xl pt-8">
          {contributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-32 text-center">
              <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
                No Contributions Yet
              </h2>
              <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
                Your submitted contributions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map((c, i) => (
                <ContributionCard key={c.id} contribution={c} index={i} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/dashboard/contribute/my?page=${page - 1}`}
                  className="rounded-lg border border-gray-900/10 px-3 py-1.5 text-sm text-gray-900/60 hover:bg-gray-900/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-gray-900/40 dark:text-white/40">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/dashboard/contribute/my?page=${page + 1}`}
                  className="rounded-lg border border-gray-900/10 px-3 py-1.5 text-sm text-gray-900/60 hover:bg-gray-900/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <BackButton href="/dashboard/contribute" label="Contribute" floating />
    </div>
  );
}
