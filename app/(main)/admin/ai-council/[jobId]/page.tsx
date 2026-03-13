import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { JobDetailClient } from "./JobDetailClient";

export const dynamic = "force-dynamic";

export default async function PipelineJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/verify");

  const { jobId } = await params;

  return <JobDetailClient jobId={jobId} />;
}
