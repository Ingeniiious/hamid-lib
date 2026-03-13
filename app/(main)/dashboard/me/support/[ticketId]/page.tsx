import { TicketDetailClient } from "./TicketDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support Ticket" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-24">
      <TicketDetailClient ticketId={ticketId} />
    </div>
  );
}
