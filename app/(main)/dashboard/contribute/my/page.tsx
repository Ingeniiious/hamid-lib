import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";
import { ContributionCard } from "@/components/ContributionCard";
import { MyContributionsStrings } from "./Strings";
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
          titleKey="contribute.myContributions"
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
            <MyContributionsStrings variant="empty" />
          ) : (
            <div className="space-y-3">
              {contributions.map((c, i) => (
                <ContributionCard key={c.id} contribution={c} index={i} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <MyContributionsStrings variant="pagination" page={page} totalPages={totalPages} />
          )}
        </div>
      </div>
      <BackButton href="/dashboard/contribute" labelKey="contribute.title" floating />
    </div>
  );
}
