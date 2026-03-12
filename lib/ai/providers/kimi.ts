import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call (env vars aren't available at build time on Vercel)
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) throw new Error("KIMI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
      timeout: 120_000, // 120s — Vercel Pro allows 300s maxDuration
      maxRetries: 0, // Disable SDK auto-retry — orchestrator handles retries
    });
  }
  return client;
}

export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const ai = getClient();

  // Kimi K2.5 docs: temperature, top_p, n, presence_penalty, frequency_penalty
  // are ALL FIXED and cannot be modified for kimi-k2.5. Do NOT pass them.
  // thinking: {"type":"disabled"} = non-thinking mode (faster, no reasoning chain).
  // max_tokens is DEPRECATED — use max_completion_tokens instead.
  // Context window: 262,144 tokens. Output default: 1024 if not specified.
  const body = {
    model: "kimi-k2.5",
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_completion_tokens: request.maxTokens ?? 32768,
    ...(request.responseFormat === "json" && {
      response_format: { type: "json_object" as const },
    }),
    // Kimi K2.5 extension: disable thinking for structured content generation
    thinking: { type: "disabled" },
  };

  // Cast to bypass OpenAI SDK type constraints on the `thinking` extension field
  const response = await ai.chat.completions.create(
    body as unknown as ChatCompletionCreateParamsNonStreaming
  );

  const choice = response.choices[0];

  return {
    content: choice?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    modelId: response.model,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}
