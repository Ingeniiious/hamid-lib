import { getNotificationStats } from "./actions";
import { NotificationsClient } from "./NotificationsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const stats = await getNotificationStats();
  return <NotificationsClient stats={stats} />;
}
