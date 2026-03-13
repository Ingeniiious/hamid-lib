// ---------------------------------------------------------------------------
// AI Pipeline Cron Handler — Batch Architecture
//
// Uses orchestrator-batch.ts which submits batch jobs for Steps 2-3
// (GPT, Claude) instead of synchronous real-time calls.
//
// KEY DIFFERENCE from ai-pipeline/route.ts:
//   - Each invocation is FAST (1-5s for batch ops) instead of 100-270s
//   - maxDuration reduced from 300s → 60s (only real-time for Kimi/Gemini/Grok)
//   - Handles batch_submitted/batch_processing statuses gracefully
//   - Falls through to generation batch when council is blocked by a batch
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { processNextStep, processGenerationBatch } from "@/lib/ai/orchestrator-batch";

export const runtime = "nodejs";
export const maxDuration = 300; // Still 300s for real-time Kimi/Gemini/Grok steps

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();
    const MAX_LOOP_MS = 25_000;
    const results: Array<{ step: number | string; status: string }> = [];

    while (Date.now() - startTime < MAX_LOOP_MS) {
      // Try council step first (sequential, steps 1-5)
      const result = await processNextStep();

      if (result) {
        results.push({ step: result.step, status: result.status });

        // ── Batch statuses — council is blocked, try generation batches ──
        if (result.status === "batch_submitted" || result.status === "batch_processing") {
          // Council step is waiting for batch API — fall through to
          // check generation batches, then exit. No point looping.
          break;
        }

        // ── Error/retry statuses — pause and continue ───────────────────
        if (result.status === "retrying" || result.status === "skipped" || result.status === "failed") {
          await new Promise((r) => setTimeout(r, 1000));
        } else if (result.status === "step_completed" || result.status === "generating") {
          await new Promise((r) => setTimeout(r, 500));
        }

        // ── Terminal statuses — stop ────────────────────────────────────
        if (result.status === "generating") break;
        if (result.status === "completed" || result.status === "rejected") break;

        continue;
      }

      // No council step — try generation batch (parallel, steps 100+)
      const batchResult = await processGenerationBatch();
      if (batchResult) {
        console.log(
          `[ai-pipeline-batch] Batch ${batchResult.contentType}: ` +
          batchResult.results.map((r) => `${r.model}=${r.status}`).join(", ")
        );
        results.push(
          ...batchResult.results.map((r) => ({ step: `gen:${r.model}`, status: r.status }))
        );
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      // Nothing to do
      break;
    }

    if (results.length === 0) {
      return NextResponse.json({ status: "idle", message: "No pending jobs" });
    }

    return NextResponse.json({
      status: "processed",
      stepsProcessed: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[ai-pipeline-batch] Cron error:", error);
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
