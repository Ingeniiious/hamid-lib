import { AdminTicketDetailClient } from "./AdminTicketDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support Ticket" };

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <AdminTicketDetailClient ticketId={ticketId} />;
}
