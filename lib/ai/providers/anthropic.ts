import Anthropic from "@anthropic-ai/sdk";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call (env vars aren't available at build time on Vercel)
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return client;
}

/**
 * Strip markdown code fences from a string (defensive fallback).
 * Claude sometimes wraps JSON in ```json ... ``` even when asked not to.
 */
function stripJsonWrapper(text: string): string {
  const trimmed = text.trim();
  // Match ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
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

  const wantsJson = request.responseFormat === "json";

  const t0 = Date.now();
  const inputCharCount = nonSystemMessages.reduce((s, m) => s + m.content.length, 0) + (systemMessage?.content.length ?? 0);
  console.log(`[anthropic] Starting stream — model=${request.maxTokens ?? 16384} max_tokens, ~${inputCharCount} input chars, json=${wantsJson}`);

  // Use streaming + finalMessage() to prevent HTTP timeouts.
  // Non-streaming requests sit idle while Claude generates — the SDK sees
  // zero data flowing and fires "Request timed out." even though Claude is
  // working fine. Streaming keeps the connection alive with incremental data.
  const stream = ai.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: request.maxTokens ?? 16384,
    temperature: request.temperature ?? 0.3,
    ...(systemMessage && { system: systemMessage.content }),
    messages: nonSystemMessages,
    // Structured outputs — guarantees valid JSON via constrained decoding.
    // Uses a loose { type: "object" } schema so any JSON object is accepted.
    // See: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    ...(wantsJson && {
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: { type: "object" },
        },
      },
    }),
  });

  let firstTokenMs: number | null = null;
  let tokenCount = 0;

  stream.on("text", () => {
    tokenCount++;
    if (!firstTokenMs) {
      firstTokenMs = Date.now() - t0;
      console.log(`[anthropic] First token at ${firstTokenMs}ms`);
    }
  });

  const response = await stream.finalMessage();
  const totalMs = Date.now() - t0;
  const textBlock = response.content.find((b) => b.type === "text");

  let content = textBlock?.text ?? "";

  // Defensive: strip markdown fences if Claude still wraps JSON despite output_config
  if (wantsJson && content) {
    content = stripJsonWrapper(content);
  }

  console.log(
    `[anthropic] Done in ${totalMs}ms — first_token=${firstTokenMs ?? "never"}ms, ` +
    `chunks=${tokenCount}, in=${response.usage.input_tokens}, out=${response.usage.output_tokens}, ` +
    `stop=${response.stop_reason}`
  );

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    modelId: response.model,
    finishReason: response.stop_reason ?? "unknown",
  };
}
