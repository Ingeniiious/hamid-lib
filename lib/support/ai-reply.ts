import { complete } from "@/lib/ai/client";

export async function generateAiReply(
  subject: string,
  userMessage: string,
  category: string
): Promise<string> {
  try {
    const response = await complete({
      model: "kimi",
      messages: [
        {
          role: "system",
          content: `You are a friendly, helpful support assistant for Libraryyy — an open-source university course library platform. You help students with their questions and issues.

Category: ${category}

Guidelines:
- Be concise (2-4 short paragraphs)
- Be warm and supportive — these are university students
- If the issue is technical, suggest common solutions
- If the issue requires human attention, let them know an admin will follow up
- Never make promises about timelines
- Sign off as "Libraryyy AI Assistant"`,
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\n${userMessage}`,
        },
      ],
      maxTokens: 1000,
    });
    return response.content;
  } catch {
    return `Thank you for reaching out! We've received your message and our team will get back to you as soon as possible.\n\nIn the meantime, if your issue is urgent, feel free to add more details to this ticket.\n\n— Libraryyy AI Assistant`;
  }
}
