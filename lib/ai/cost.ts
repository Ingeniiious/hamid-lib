// ---------------------------------------------------------------------------
// AI Council -- cost & token formatting helpers
// ---------------------------------------------------------------------------

import type { ModelConfig } from "./types";

/**
 * Calculate the USD cost for a single pipeline step.
 */
export function calculateStepCost(
  inputTokens: number,
  outputTokens: number,
  config: ModelConfig
): number {
  return (
    inputTokens * config.costPerInputToken +
    outputTokens * config.costPerOutputToken
  );
}

/**
 * Format a USD amount for display.
 * Sub-cent values show as cents (e.g. "$0.42c"), otherwise dollars.
 */
export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}c`;
  return `$${usd.toFixed(4)}`;
}

/**
 * Format a token count for display (e.g. "1.2K", "3.4M").
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}
