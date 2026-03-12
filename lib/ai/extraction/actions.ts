// ---------------------------------------------------------------------------
// Lightweight extraction job actions (cancel / retry)
// Separated from orchestrator.ts to avoid pulling in heavy deps
// (pdf-parse, mammoth, adm-zip, sharp) into API routes that don't need them.
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { extractionJob } from "@/database/schema";
import { eq } from "drizzle-orm";

const TERMINAL_STATUSES = ["completed", "failed"];

export async function cancelExtractionJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(extractionJob)
    .where(eq(extractionJob.id, jobId))
    .limit(1);

  if (!job || TERMINAL_STATUSES.includes(job.status)) {
    return false;
  }

  await db
    .update(extractionJob)
    .set({
      status: "failed",
      errorMessage: "Cancelled by admin",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, jobId));

  return true;
}

export async function retryExtractionJob(jobId: string): Promise<boolean> {
  const [job] = await db
    .select()
    .from(extractionJob)
    .where(eq(extractionJob.id, jobId))
    .limit(1);

  if (!job || job.status !== "failed") {
    return false;
  }

  await db
    .update(extractionJob)
    .set({
      status: "pending",
      errorMessage: null,
      completedAt: null,
      retryCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(extractionJob.id, jobId));

  return true;
}
