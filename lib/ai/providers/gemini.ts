import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AICompletionRequest, AICompletionResponse } from "../types";

// Lazy-init client — only created on first call (env vars aren't available at build time on Vercel)
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function complete(
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const ai = getClient();

  // Gemini separates system instruction from chat contents
  const systemMessage = request.messages.find((m) => m.role === "system");
  const chatMessages = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  if (chatMessages.length === 0) {
    throw new Error("No messages provided to Gemini after filtering system messages");
  }

  const model = ai.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    ...(systemMessage && { systemInstruction: systemMessage.content }),
    generationConfig: {
      temperature: request.temperature ?? 0.1,
      maxOutputTokens: request.maxTokens ?? 16384,
      ...(request.responseFormat === "json" && {
        responseMimeType: "application/json",
      }),
    },
  });

  // Single user message: use generateContent directly. Multi-turn: use chat.
  let response;
  if (chatMessages.length === 1 && chatMessages[0].role === "user") {
    response = await model.generateContent(chatMessages[0].parts);
  } else {
    const chat = model.startChat({ history: chatMessages.slice(0, -1) });
    const lastMessage = chatMessages[chatMessages.length - 1];
    response = await chat.sendMessage(lastMessage.parts);
  }

  const result = response.response;
  const usage = result.usageMetadata;

  return {
    content: result.text() ?? "",
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    modelId: "gemini-3.1-pro-preview",
    finishReason: result.candidates?.[0]?.finishReason ?? "unknown",
  };
}
