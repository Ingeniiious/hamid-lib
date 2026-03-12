import Anthropic from "@anthropic-ai/sdk";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call (env vars aren't available at build time on Vercel)
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 0 });
  }
  return client;
}

export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const ai = getClient();

  // Anthropic separates system prompt from messages — extract it
  const systemMessage = request.messages.find((m) => m.role === "system");
  const nonSystemMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await ai.messages.create({
    model: "claude-opus-4-6",
    max_tokens: request.maxTokens ?? 16384,
    temperature: request.temperature ?? 0.3,
    ...(systemMessage && { system: systemMessage.content }),
    messages: nonSystemMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");

  return {
    content: textBlock?.text ?? "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    modelId: response.model,
    finishReason: response.stop_reason ?? "unknown",
  };
}
