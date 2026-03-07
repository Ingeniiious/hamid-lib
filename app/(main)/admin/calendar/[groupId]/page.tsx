import { getSeriesDetail } from "./actions";
import { SeriesDetailClient } from "./SeriesDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar Detail" };

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const detail = await getSeriesDetail(groupId);
  if (!detail) notFound();
  return <SeriesDetailClient detail={detail} />;
}
