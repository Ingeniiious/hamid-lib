// ---------------------------------------------------------------------------
// AI Council -- Batch API module
//
// Submits work to provider batch APIs (50% discount, up to 24h processing)
// and polls for results. Used by the orchestrator for Steps 2-5
// (GPT, Claude, Gemini, Grok) instead of synchronous real-time calls
// that timeout on Vercel.
//
// Flow: submitBatch() → save batchJobId → next cron polls checkBatch()
// Each operation takes 1-2s vs 100-270s for real-time calls.
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { AICompletionRequest, AICompletionResponse, ModelSlug } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchCheckResult {
  status: "processing" | "completed" | "failed";
  response?: AICompletionResponse;
  error?: string;
}

// ---------------------------------------------------------------------------
// Batch-capable model registry
// ---------------------------------------------------------------------------

/**
 * Models with batch API support:
 * - chatgpt (OpenAI Batch API)
 * - claude (Anthropic Message Batches)
 * - gemini (Google AI @google/genai inline batch)
 * - grok (xAI — OpenAI-compatible batch at api.x.ai/v1)
 *
 * NOT supported:
 * - kimi (no batch API, but Step 1 is fast/cheap so real-time is fine)
 */
const BATCH_MODELS: Set<ModelSlug> = new Set(["chatgpt", "claude", "gemini", "grok"]);

export function supportsBatch(slug: ModelSlug): boolean {
  return BATCH_MODELS.has(slug);
}

// ---------------------------------------------------------------------------
// Lazy clients (separate from provider clients — shorter timeouts for batch ops)
// ---------------------------------------------------------------------------

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    openaiClient = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
  }
  return openaiClient;
}

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    anthropicClient = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return anthropicClient;
}

let grokClient: OpenAI | null = null;
function getGrok(): OpenAI {
  if (!grokClient) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error("XAI_API_KEY is not set");
    grokClient = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
      timeout: 30_000,
      maxRetries: 0,
    });
  }
  return grokClient;
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// ---------------------------------------------------------------------------
// Submit batch job — returns provider-specific batch ID
// ---------------------------------------------------------------------------

export async function submitBatch(
  slug: ModelSlug,
  request: AICompletionRequest,
  customId: string
): Promise<string> {
  if (slug === "chatgpt") return submitOpenAI(request, customId);
  if (slug === "claude") return submitAnthropic(request, customId);
  if (slug === "gemini") return submitGemini(request, customId);
  if (slug === "grok") return submitGrok(request, customId);
  throw new Error(`Batch not supported for model: ${slug}`);
}

async function submitOpenAI(
  request: AICompletionRequest,
  customId: string
): Promise<string> {
  const ai = getOpenAI();

  // Build the single JSONL request line
  const body: Record<string, unknown> = {
    model: request.modelId ?? "gpt-5.4",
    messages: request.messages.map((m) => ({
      role: m.role === "system" ? "developer" : m.role,
      content: m.content,
    })),
    temperature: request.temperature ?? 0.2,
    max_completion_tokens: request.maxTokens ?? 16384,
  };
  if (request.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const jsonlLine = JSON.stringify({
    custom_id: customId,
    method: "POST",
    url: "/v1/chat/completions",
    body,
  });

  // Upload JSONL file
  const file = await ai.files.create({
    file: new File([jsonlLine], `batch-${customId}.jsonl`, {
      type: "application/jsonl",
    }),
    purpose: "batch" as const,
  });

  // Create batch
  const batch = await ai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(
    `[batch] OpenAI batch ${batch.id} submitted (file: ${file.id}, custom_id: ${customId})`
  );
  return batch.id;
}

async function submitAnthropic(
  request: AICompletionRequest,
  customId: string
): Promise<string> {
  const ai = getAnthropic();

  const systemMessage = request.messages.find((m) => m.role === "system");
  const nonSystemMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const wantsJson = request.responseFormat === "json";

  const batch = await ai.messages.batches.create({
    requests: [
      {
        custom_id: customId,
        params: {
          model: request.modelId ?? "claude-sonnet-4-6",
          max_tokens: request.maxTokens ?? 16384,
          temperature: request.temperature ?? 0.3,
          ...(systemMessage && { system: systemMessage.content }),
          messages: nonSystemMessages,
          // Prompt-based JSON — no output_config needed.
          // Opus 4.6 requires additionalProperties: false on ALL nested objects
          // in output_config schemas, which is impractical for our 12 content types.
          // Claude follows JSON instructions in prompts reliably.
        },
      },
    ],
  });

  console.log(
    `[batch] Anthropic batch ${batch.id} submitted (custom_id: ${customId})`
  );
  return batch.id;
}

// ---------------------------------------------------------------------------
// Check batch status — poll for completion
// ---------------------------------------------------------------------------

export async function checkBatch(
  slug: ModelSlug,
  batchJobId: string
): Promise<BatchCheckResult> {
  if (slug === "chatgpt") return checkOpenAI(batchJobId);
  if (slug === "claude") return checkAnthropic(batchJobId);
  if (slug === "gemini") return checkGemini(batchJobId);
  if (slug === "grok") return checkGrok(batchJobId);
  throw new Error(`Batch not supported for model: ${slug}`);
}

async function checkOpenAI(batchId: string): Promise<BatchCheckResult> {
  const ai = getOpenAI();
  const batch = await ai.batches.retrieve(batchId);

  if (batch.status === "completed") {
    if (!batch.output_file_id) {
      return { status: "failed", error: "Batch completed but no output file" };
    }

    // Download and parse the output JSONL (single line for our single-request batch)
    const fileResponse = await ai.files.content(batch.output_file_id);
    const text = await fileResponse.text();
    const line = text.trim().split("\n")[0];
    const result = JSON.parse(line);

    if (result.error) {
      return {
        status: "failed",
        error: `Batch request error: ${JSON.stringify(result.error)}`,
      };
    }

    const choice = result.response?.body?.choices?.[0];
    const usage = result.response?.body?.usage;

    // Cleanup uploaded files (best effort — don't fail if cleanup fails)
    try {
      if (batch.input_file_id) await ai.files.delete(batch.input_file_id);
      if (batch.output_file_id) await ai.files.delete(batch.output_file_id);
    } catch {
      /* ignore cleanup errors */
    }

    console.log(
      `[batch] OpenAI batch ${batchId} completed — ${usage?.prompt_tokens ?? 0}+${usage?.completion_tokens ?? 0} tokens`
    );

    return {
      status: "completed",
      response: {
        content: choice?.message?.content ?? "",
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        modelId: result.response?.body?.model ?? "gpt-5.4",
        finishReason: choice?.finish_reason ?? "unknown",
      },
    };
  }

  if (["failed", "expired", "cancelled"].includes(batch.status)) {
    const errorMsg =
      batch.errors?.data?.[0]?.message ?? `Batch ${batch.status}`;
    console.log(`[batch] OpenAI batch ${batchId} ${batch.status}: ${errorMsg}`);
    return { status: "failed", error: errorMsg };
  }

  // Still processing: validating, in_progress, finalizing
  return { status: "processing" };
}

async function checkAnthropic(batchId: string): Promise<BatchCheckResult> {
  const ai = getAnthropic();
  const batch = await ai.messages.batches.retrieve(batchId);

  if (batch.processing_status === "ended") {
    // Stream results (single request = single result)
    const results: Array<{
      custom_id: string;
      result: {
        type: string;
        message?: {
          content: Array<{ type: string; text?: string }>;
          usage: { input_tokens: number; output_tokens: number };
          model: string;
          stop_reason: string;
        };
        error?: { message: string };
      };
    }> = [];

    const resultsStream = await ai.messages.batches.results(batchId);
    for await (const result of resultsStream) {
      results.push(result as typeof results[number]);
    }

    if (results.length === 0) {
      return { status: "failed", error: "Batch ended but no results returned" };
    }

    const r = results[0];

    if (r.result.type === "succeeded" && r.result.message) {
      const msg = r.result.message;
      const textBlock = msg.content?.find(
        (b: { type: string }) => b.type === "text"
      );
      let content = textBlock?.text ?? "";

      // Defensive: strip markdown code fences (Claude sometimes wraps JSON)
      const fenceMatch = content
        .trim()
        .match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
      if (fenceMatch) content = fenceMatch[1].trim();

      console.log(
        `[batch] Anthropic batch ${batchId} completed — ${msg.usage?.input_tokens ?? 0}+${msg.usage?.output_tokens ?? 0} tokens`
      );

      return {
        status: "completed",
        response: {
          content,
          inputTokens: msg.usage?.input_tokens ?? 0,
          outputTokens: msg.usage?.output_tokens ?? 0,
          modelId: msg.model ?? "claude-sonnet-4-6",
          finishReason: msg.stop_reason ?? "unknown",
        },
      };
    }

    const errorMsg =
      r.result.error?.message ?? `Batch result type: ${r.result.type}`;
    console.log(
      `[batch] Anthropic batch ${batchId} failed: ${errorMsg}`
    );
    return { status: "failed", error: errorMsg };
  }

  // Still processing
  return { status: "processing" };
}

// ---------------------------------------------------------------------------
// Gemini (Google) — @google/genai inline batch API
// Uses inline requests (no file upload), results via inlinedResponses.
// No webhook support — cron polling is the primary completion mechanism.
// ---------------------------------------------------------------------------

async function submitGemini(
  request: AICompletionRequest,
  customId: string
): Promise<string> {
  const ai = getGemini();

  const systemMessage = request.messages.find((m) => m.role === "system");
  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const wantsJson = request.responseFormat === "json";

  const batchJob = await ai.batches.create({
    model: request.modelId ?? "gemini-3.1-pro-preview",
    src: [
      {
        contents: chatMessages,
        config: {
          ...(systemMessage && {
            systemInstruction: { parts: [{ text: systemMessage.content }] },
          }),
          temperature: request.temperature ?? 0.1,
          maxOutputTokens: request.maxTokens ?? 16384,
          ...(wantsJson && { responseMimeType: "application/json" }),
        },
        metadata: { customId },
      },
    ],
    config: {
      displayName: `pipeline-${customId}`,
    },
  });

  const batchId = batchJob.name!;
  console.log(
    `[batch] Gemini batch ${batchId} submitted (custom_id: ${customId})`
  );
  return batchId;
}

const GEMINI_TERMINAL_STATES = new Set([
  "JOB_STATE_SUCCEEDED",
  "JOB_STATE_FAILED",
  "JOB_STATE_CANCELLED",
  "JOB_STATE_EXPIRED",
]);

async function checkGemini(batchName: string): Promise<BatchCheckResult> {
  const ai = getGemini();
  const job = await ai.batches.get({ name: batchName });

  if (job.state === "JOB_STATE_SUCCEEDED") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dest = job.dest as any;
    const responses = dest?.inlinedResponses;

    if (!responses || responses.length === 0) {
      return { status: "failed", error: "Batch succeeded but no responses returned" };
    }

    const first = responses[0];

    if (first.error) {
      return {
        status: "failed",
        error: `Gemini batch request error: ${first.error.message ?? JSON.stringify(first.error)}`,
      };
    }

    const resp = first.response;
    // Extract text from response — @google/genai GenerateContentResponse
    let content = "";
    if (resp?.candidates?.[0]?.content?.parts) {
      content = resp.candidates[0].content.parts
        .map((p: { text?: string }) => p.text ?? "")
        .join("");
    }

    // Strip markdown code fences (Gemini sometimes wraps JSON)
    const fenceMatch = content
      .trim()
      .match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (fenceMatch) content = fenceMatch[1].trim();

    const usage = resp?.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;

    console.log(
      `[batch] Gemini batch ${batchName} completed — ${inputTokens}+${outputTokens} tokens`
    );

    // Cleanup batch job (best effort)
    try {
      await ai.batches.delete({ name: batchName });
    } catch {
      /* ignore cleanup errors */
    }

    return {
      status: "completed",
      response: {
        content,
        inputTokens,
        outputTokens,
        modelId: resp?.modelVersion ?? "gemini-3.1-pro-preview",
        finishReason: resp?.candidates?.[0]?.finishReason ?? "unknown",
      },
    };
  }

  if (GEMINI_TERMINAL_STATES.has(job.state ?? "")) {
    const errorMsg = job.error?.message ?? `Batch ${job.state}`;
    console.log(`[batch] Gemini batch ${batchName} ${job.state}: ${errorMsg}`);
    return { status: "failed", error: errorMsg };
  }

  // Still processing: PENDING, QUEUED, RUNNING
  return { status: "processing" };
}

// ---------------------------------------------------------------------------
// Grok (xAI) — OpenAI-compatible batch API at api.x.ai/v1
// ---------------------------------------------------------------------------

async function submitGrok(
  request: AICompletionRequest,
  customId: string
): Promise<string> {
  const ai = getGrok();

  const body: Record<string, unknown> = {
    model: request.modelId ?? "grok-4.20-beta-0309-non-reasoning",
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: request.temperature ?? 0.1,
    max_completion_tokens: request.maxTokens ?? 16384,
  };
  if (request.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const jsonlLine = JSON.stringify({
    custom_id: customId,
    method: "POST",
    url: "/v1/chat/completions",
    body,
  });

  const file = await ai.files.create({
    file: new File([jsonlLine], `batch-grok-${customId}.jsonl`, {
      type: "application/jsonl",
    }),
    purpose: "batch" as const,
  });

  const batch = await ai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(
    `[batch] Grok batch ${batch.id} submitted (file: ${file.id}, custom_id: ${customId})`
  );
  return batch.id;
}

async function checkGrok(batchId: string): Promise<BatchCheckResult> {
  const ai = getGrok();
  const batch = await ai.batches.retrieve(batchId);

  if (batch.status === "completed") {
    if (!batch.output_file_id) {
      return { status: "failed", error: "Batch completed but no output file" };
    }

    const fileResponse = await ai.files.content(batch.output_file_id);
    const text = await fileResponse.text();
    const line = text.trim().split("\n")[0];
    const result = JSON.parse(line);

    if (result.error) {
      return {
        status: "failed",
        error: `Batch request error: ${JSON.stringify(result.error)}`,
      };
    }

    const choice = result.response?.body?.choices?.[0];
    const usage = result.response?.body?.usage;

    try {
      if (batch.input_file_id) await ai.files.delete(batch.input_file_id);
      if (batch.output_file_id) await ai.files.delete(batch.output_file_id);
    } catch {
      /* ignore cleanup errors */
    }

    console.log(
      `[batch] Grok batch ${batchId} completed — ${usage?.prompt_tokens ?? 0}+${usage?.completion_tokens ?? 0} tokens`
    );

    return {
      status: "completed",
      response: {
        content: choice?.message?.content ?? "",
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        modelId: result.response?.body?.model ?? "grok-4.20-beta-0309-non-reasoning",
        finishReason: choice?.finish_reason ?? "unknown",
      },
    };
  }

  if (["failed", "expired", "cancelled"].includes(batch.status)) {
    const errorMsg =
      batch.errors?.data?.[0]?.message ?? `Batch ${batch.status}`;
    console.log(`[batch] Grok batch ${batchId} ${batch.status}: ${errorMsg}`);
    return { status: "failed", error: errorMsg };
  }

  return { status: "processing" };
}

// ---------------------------------------------------------------------------
// Cancel batch job — best-effort, used when cancelling a pipeline job
// ---------------------------------------------------------------------------

export async function cancelBatch(
  slug: ModelSlug,
  batchJobId: string
): Promise<void> {
  try {
    if (slug === "chatgpt") {
      const ai = getOpenAI();
      await ai.batches.cancel(batchJobId);
      console.log(`[batch] OpenAI batch ${batchJobId} cancelled`);
    } else if (slug === "claude") {
      const ai = getAnthropic();
      await ai.messages.batches.cancel(batchJobId);
      console.log(`[batch] Anthropic batch ${batchJobId} cancelled`);
    } else if (slug === "gemini") {
      const ai = getGemini();
      await ai.batches.cancel({ name: batchJobId });
      console.log(`[batch] Gemini batch ${batchJobId} cancelled`);
    } else if (slug === "grok") {
      const ai = getGrok();
      await ai.batches.cancel(batchJobId);
      console.log(`[batch] Grok batch ${batchJobId} cancelled`);
    }
  } catch (error) {
    // Best effort — batch may already be completed/cancelled
    console.log(
      `[batch] Failed to cancel ${slug} batch ${batchJobId}: ${(error as Error).message}`
    );
  }
}
