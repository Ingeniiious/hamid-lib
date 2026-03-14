import OpenAI from "openai";
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
      timeout: 240_000, // 240s — Kimi creator can take 100-120s+ on large sources
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
    model: request.modelId ?? "kimi-k2.5",
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

  const t0 = Date.now();
  const inputCharCount = request.messages.reduce((s, m) => s + m.content.length, 0);
  console.log(`[kimi] Starting stream — model=kimi-k2.5, max_tokens=${request.maxTokens ?? 32768}, ~${inputCharCount} input chars, json=${request.responseFormat === "json"}`);

  // Use streaming to prevent HTTP connection idle timeouts.
  // Non-streaming requests sit idle while Kimi generates — the connection gets
  // killed by intermediate proxies/infrastructure after 30-60s of no data flowing,
  // even though Kimi is still working fine. Streaming keeps the connection alive
  // with incremental data chunks (same fix applied to Claude provider).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = (await ai.chat.completions.create({
    ...body,
    stream: true,
    stream_options: { include_usage: true },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as unknown as AsyncIterable<any>;

  let content = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let modelId = "kimi-k2.5";
  let finishReason = "unknown";
  let firstTokenMs: number | null = null;
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    if (!firstTokenMs) {
      firstTokenMs = Date.now() - t0;
      console.log(`[kimi] First token at ${firstTokenMs}ms`);
    }

    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) {
      content += choice.delta.content;
    }
    if (choice?.finish_reason) {
      finishReason = choice.finish_reason;
    }

    // Usage comes in the final chunk when stream_options.include_usage is set
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0;
      outputTokens = chunk.usage.completion_tokens ?? 0;
    }
    if (chunk.model) {
      modelId = chunk.model;
    }
  }

  const totalMs = Date.now() - t0;
  console.log(
    `[kimi] Done in ${totalMs}ms — first_token=${firstTokenMs ?? "never"}ms, ` +
    `chunks=${chunkCount}, in=${inputTokens}, out=${outputTokens}, stop=${finishReason}`
  );

  return {
    content,
    inputTokens,
    outputTokens,
    modelId,
    finishReason,
  };
}
