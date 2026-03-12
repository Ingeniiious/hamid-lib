import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { cancelJob, retryJob } from "@/lib/ai/orchestrator";
import {
  cancelExtractionJob,
  retryExtractionJob,
} from "@/lib/ai/extraction/orchestrator";

export const dynamic = "force-dynamic";

/**
 * POST — Cancel or retry extraction/pipeline jobs.
 *
 * Body: { action: "cancel" | "retry", type: "extraction" | "pipeline", jobId: string }
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, type, jobId } = body as {
      action: string;
      type: string;
      jobId: string;
    };

    if (!action || !type || !jobId) {
      return NextResponse.json(
        { error: "Missing required fields: action, type, jobId" },
        { status: 400 }
      );
    }

    if (!["cancel", "retry"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'cancel' or 'retry'" },
        { status: 400 }
      );
    }

    if (!["extraction", "pipeline"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'extraction' or 'pipeline'" },
        { status: 400 }
      );
    }

    let success = false;

    if (type === "extraction") {
      success =
        action === "cancel"
          ? await cancelExtractionJob(jobId)
          : await retryExtractionJob(jobId);
    } else {
      success =
        action === "cancel"
          ? await cancelJob(jobId)
          : await retryJob(jobId);
    }

    if (!success) {
      return NextResponse.json(
        {
          error:
            action === "cancel"
              ? "Job cannot be cancelled (already terminal)"
              : "Job cannot be retried (not in failed state)",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, action, type, jobId });
  } catch (error) {
    console.error("Job action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
