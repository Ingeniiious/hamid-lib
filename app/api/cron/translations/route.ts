import { NextResponse } from "next/server";
import { processNextTranslation } from "@/lib/ai/translation";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/translations
 *
 * Cron handler that processes pending translation jobs.
 * Loops until no more pending jobs or time limit approached.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const startTime = Date.now();
    const MAX_LOOP_MS = 280_000; // 280s — leave 20s buffer
    const results: Array<{ id: string; status: string; targetLanguage: string }> = [];

    while (Date.now() - startTime < MAX_LOOP_MS) {
      const result = await processNextTranslation();
      if (!result) break;

      results.push(result);

      // Brief pause between jobs for DB writes
      await new Promise((r) => setTimeout(r, 500));
    }

    if (results.length === 0) {
      return NextResponse.json({
        status: "idle",
        message: "No pending translations",
      });
    }

    return NextResponse.json({
      status: "processed",
      translationsProcessed: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[translations] Cron error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
