import { getUserStats } from "./actions";
import { UsersClient } from "./UsersClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const stats = await getUserStats();
  return <UsersClient stats={stats} />;
}
