import { getCalendarStats } from "./actions";
import { CalendarClient } from "./CalendarClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar Events" };

export default async function AdminCalendarPage() {
  const stats = await getCalendarStats();
  return <CalendarClient stats={stats} />;
}
