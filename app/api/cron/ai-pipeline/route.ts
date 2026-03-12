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
