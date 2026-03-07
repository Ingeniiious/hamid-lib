import { getTeamContext } from "./actions";
import { TeamClient } from "./TeamClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const context = await getTeamContext();
  return <TeamClient context={context} />;
}
