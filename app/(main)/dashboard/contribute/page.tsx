import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";
import { ContributorVerification } from "@/components/ContributorVerification";
import { ContributeForm } from "@/components/ContributeForm";
import { getContributorStatus, getCoursesForContribution } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute",
  robots: { index: false },
};

export default async function ContributePage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");

  const { verified } = await getContributorStatus();

  let courses: { id: string; title: string }[] = [];
  if (verified) {
    const result = await getCoursesForContribution();
    courses = result.courses;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title="Contribute"
          subtitle={
            verified
              ? "Share course materials with the community"
              : "Verify your university email to get started"
          }
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
        <div className="mx-auto max-w-5xl pt-8">
          {verified ? (
            <ContributeForm courses={courses} />
          ) : (
            <ContributorVerification />
          )}
        </div>
      </div>
      <BackButton href="/dashboard" label="Dashboard" floating />
    </div>
  );
}
