import { getReviewsOverview } from "./actions";
import { AdminReviewsClient } from "./AdminReviewsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reviews — Admin", robots: { index: false } };

export default async function AdminReviewsPage() {
  const overview = await getReviewsOverview();
  return <AdminReviewsClient overview={overview} />;
}
