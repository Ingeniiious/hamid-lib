import { NextResponse } from "next/server";
import { processNextStep, processGenerationBatch } from "@/lib/ai/orchestrator";

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
    const startTime = Date.now();
    const MAX_LOOP_MS = 25_000; // 25s — leave 275s for AI calls
    const results: Array<{ step: number | string; status: string }> = [];

    while (Date.now() - startTime < MAX_LOOP_MS) {
      // Try council step first (sequential, steps 1-5)
      const result = await processNextStep();

      if (result) {
        results.push({ step: result.step, status: result.status });

        if (result.status === "retrying" || result.status === "skipped" || result.status === "failed") {
          await new Promise((r) => setTimeout(r, 1000));
        } else if (result.status === "step_completed" || result.status === "generating") {
          await new Promise((r) => setTimeout(r, 500));
        }

        // If processNextStep returned "generating", it means council is done
        // and generation steps were just created. Switch to batch mode.
        if (result.status === "generating") {
          break; // Exit loop, fall through to generation batch below
        }
        if (result.status === "completed" || result.status === "rejected") {
          break;
        }
        continue;
      }

      // No council step found — try generation batch (parallel, steps 100+)
      const batchResult = await processGenerationBatch();
      if (batchResult) {
        console.log(
          `[ai-pipeline] Batch ${batchResult.contentType}: ` +
          batchResult.results.map((r) => `${r.model}=${r.status}`).join(", ")
        );
        results.push(
          ...batchResult.results.map((r) => ({ step: `gen:${r.model}`, status: r.status }))
        );
        // After a batch, pause briefly then continue loop for next content type
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
    console.error("[ai-pipeline] Cron error:", error);

    const errMsg = error instanceof Error ? error.message : String(error);
    try {
      const { checkAndAlertBilling } = await import("@/lib/admin-alerts");
      await checkAndAlertBilling("AI Pipeline", errMsg, {
        cron: "/api/cron/ai-pipeline",
      });
    } catch { /* best-effort */ }

    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
