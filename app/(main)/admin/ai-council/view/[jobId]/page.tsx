import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { ContentPreviewClient } from "./ContentPreviewClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content Preview — AI Council",
  robots: { index: false },
};

export default async function ContentPreviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/verify");

  const { jobId } = await params;

  return <ContentPreviewClient jobId={jobId} />;
}
