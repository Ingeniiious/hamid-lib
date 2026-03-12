import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { AICouncilClient } from "./AICouncilClient";

export const dynamic = "force-dynamic";

export default async function AICouncilPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/verify");

  return <AICouncilClient />;
}
