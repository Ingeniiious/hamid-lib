// ---------------------------------------------------------------------------
// Extraction Pipeline Cron Handler
// Runs every 2 minutes via Vercel cron.
// Each invocation processes one phase of one extraction job.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { processNextExtraction } from "@/lib/ai/extraction/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processNextExtraction();

    if (!result) {
      return NextResponse.json({ message: "No extraction jobs to process" });
    }

    return NextResponse.json({
      message: "Extraction step processed",
      jobId: result.jobId,
      phase: result.phase,
      status: result.status,
    });
  } catch (error) {
    console.error("[extraction-cron] Error:", error);
    return NextResponse.json(
      {
        error: "Extraction processing failed",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
