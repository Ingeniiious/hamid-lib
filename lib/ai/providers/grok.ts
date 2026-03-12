import OpenAI from "openai";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
      timeout: 50_000, // 50s — leaves 10s headroom for Vercel's 60s limit
    });
  }
  return client;
}

export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const ai = getClient();

  const response = await ai.chat.completions.create({
    model: "grok-4.20-beta-0309-non-reasoning",
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: request.temperature ?? 0.1,
    max_tokens: request.maxTokens ?? 16384,
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
