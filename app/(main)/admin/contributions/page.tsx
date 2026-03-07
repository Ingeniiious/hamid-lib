import { getContributionOverview } from "./actions";
import { ContributionsClient } from "./ContributionsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contributions" };

export default async function AdminContributionsPage() {
  const stats = await getContributionOverview();
  return <ContributionsClient stats={stats} />;
}
