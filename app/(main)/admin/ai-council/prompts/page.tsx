import { getPromptStats } from "./actions";
import { PromptsClient } from "./PromptsClient";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const stats = await getPromptStats();
  return <PromptsClient stats={stats} />;
}
