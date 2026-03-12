// ---------------------------------------------------------------------------
// AI Council -- unified completion client
// Routes requests to the correct provider based on ModelSlug.
// ---------------------------------------------------------------------------

import type {
  AICompletionRequest,
  AICompletionResponse,
  ModelSlug,
} from "./types";

import { complete as completeKimi } from "./providers/kimi";
import { complete as completeOpenAI } from "./providers/openai";
import { complete as completeClaude } from "./providers/anthropic";
import { complete as completeGemini } from "./providers/gemini";
import { complete as completeGrok } from "./providers/grok";

const PROVIDER_MAP: Record<
  ModelSlug,
  (req: AICompletionRequest) => Promise<AICompletionResponse>
> = {
  kimi: completeKimi,
  chatgpt: completeOpenAI,
  claude: completeClaude,
  gemini: completeGemini,
  grok: completeGrok,
};

/**
 * Send a completion request to the specified model.
 * Routes to the correct provider automatically.
 */
export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const provider = PROVIDER_MAP[request.model];
  if (!provider) {
    throw new Error(`Unknown model: ${request.model}`);
  }
  return provider(request);
}

/**
 * Calculate cost for a completion based on per-token rates.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  costPerInputToken: number,
  costPerOutputToken: number
): number {
  return inputTokens * costPerInputToken + outputTokens * costPerOutputToken;
}
