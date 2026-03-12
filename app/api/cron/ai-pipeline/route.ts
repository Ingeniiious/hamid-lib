import { NextResponse } from "next/server";
import { processNextStep } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await processNextStep();

    if (!result) {
      return NextResponse.json({
        status: "idle",
        message: "No pending jobs",
      });
    }

    // Self-invoke: immediately process next step instead of waiting for cron tick.
    // The cron (every 2 min) is now just a safety net for stuck/retried jobs.
    if (result.status !== "failed" && result.status !== "completed") {
      const baseUrl = new URL(request.url).origin;
      fetch(`${baseUrl}/api/cron/ai-pipeline`, {
        method: "GET",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {});
    }

    return NextResponse.json({
      status: "processed",
      data: result,
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
