import { getSupportOverview } from "./actions";
import { AdminSupportClient } from "./AdminSupportClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support" };

export default async function AdminSupportPage() {
  const stats = await getSupportOverview();
  return <AdminSupportClient stats={stats} />;
}
