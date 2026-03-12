import { NextResponse } from "next/server";
import { processNextStep } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro plan allows up to 300s (5 min)

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Process steps in a loop within one invocation — no more self-chaining
    // which caused race conditions with parallel invocations grabbing steps
    // out of order. Loop until no more steps or we approach the time limit.
    const startTime = Date.now();
    const MAX_LOOP_MS = 280_000; // 280s — leave 20s buffer within 300s maxDuration
    const results: Array<{ jobId: string; step: number; status: string }> = [];

    while (Date.now() - startTime < MAX_LOOP_MS) {
      const result = await processNextStep();

      if (!result) {
        // No pending steps or no pending jobs — done
        break;
      }

      results.push(result);

      // If step failed/skipped/retrying, pause briefly for DB writes to settle
      if (result.status === "retrying" || result.status === "skipped" || result.status === "failed") {
        await new Promise((r) => setTimeout(r, 1000));
      }

      // If step completed or generating, brief pause for DB consistency
      if (result.status === "step_completed" || result.status === "generating" || result.status === "completed") {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Job completed or rejected — no more steps for this job
      if (result.status === "completed" || result.status === "rejected") {
        break;
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        status: "idle",
        message: "No pending jobs",
      });
    }

    return NextResponse.json({
      status: "processed",
      stepsProcessed: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[ai-pipeline] Cron error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
