import OpenAI from "openai";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call (env vars aren't available at build time on Vercel)
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      timeout: 240_000, // 240s — orchestrator timeout is 270s, SDK shouldn't fire first
      maxRetries: 0, // Disable SDK auto-retry — orchestrator handles retries
    });
  }
  return client;
}

export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const ai = getClient();

  // OpenAI replaced "system" role with "developer" — map it for the Chat Completions API.
  // "developer" messages are prioritized ahead of "user" messages per the OpenAI model spec.
  const messages = request.messages.map((m) => ({
    role: m.role === "system" ? ("developer" as const) : m.role,
    content: m.content,
  }));

  const response = await ai.chat.completions.create({
    model: request.modelId ?? "gpt-5.4",
    messages,
    temperature: request.temperature ?? 0.2,
    // max_tokens is DEPRECATED and incompatible with o-series models — use max_completion_tokens
    max_completion_tokens: request.maxTokens ?? 16384,
    ...(request.responseFormat === "json" && {
      response_format: { type: "json_object" as const },
    }),
  });

  const choice = response.choices[0];

  return {
    content: choice?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    modelId: response.model,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}
