import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Single query with subqueries — each subquery hits an indexed column
    const [stats] = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM extraction_job) AS total_extractions,
        (SELECT count(*) FROM extraction_job WHERE status = 'completed') AS completed_extractions,
        (SELECT count(*) FROM extraction_job WHERE status = 'failed') AS failed_extractions,
        (SELECT count(*) FROM extraction_job WHERE status NOT IN ('completed', 'failed')) AS active_extractions,
        (SELECT COALESCE(sum(extraction_tokens), 0) FROM extraction_job) AS total_extraction_tokens,
        (SELECT COALESCE(sum(extraction_cost_usd::numeric), 0) FROM extraction_job) AS total_extraction_cost,
        (SELECT count(*) FROM pipeline_job) AS total_pipelines,
        (SELECT count(*) FROM pipeline_job WHERE status = 'completed') AS completed_pipelines,
        (SELECT count(*) FROM pipeline_job WHERE status = 'failed') AS failed_pipelines,
        (SELECT count(*) FROM pipeline_job WHERE status NOT IN ('completed', 'failed', 'cancelled')) AS active_pipelines,
        (SELECT COALESCE(sum(total_input_tokens + total_output_tokens), 0) FROM pipeline_job) AS total_pipeline_tokens,
        (SELECT COALESCE(sum(total_cost_usd::numeric), 0) FROM pipeline_job) AS total_pipeline_cost,
        (SELECT count(*) FROM generated_content) AS total_generated,
        (SELECT count(*) FROM generated_content WHERE is_published = true) AS published_content
    `);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("AI Council stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
