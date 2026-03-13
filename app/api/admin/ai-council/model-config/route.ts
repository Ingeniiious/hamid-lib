import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { aiModelConfig, adminUser } from "@/database/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET — Fetch all model configs (with useBatch status from config JSONB).
 */
export async function GET() {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = await db.select().from(aiModelConfig);
  return NextResponse.json({ models });
}

/**
 * PATCH — Toggle useBatch flag on a model's config JSONB.
 * Requires OTP verification for security.
 *
 * Body: { slug: string, useBatch: boolean, otp: string }
 */
export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, useBatch, otp } = body as {
      slug: string;
      useBatch: boolean;
      otp: string;
    };

    if (!slug || typeof useBatch !== "boolean" || !otp) {
      return NextResponse.json(
        { error: "Missing required fields: slug, useBatch, otp" },
        { status: 400 }
      );
    }

    // ── Verify OTP ────────────────────────────────────────────────────────
    const [admin] = await db
      .select({
        modeSwitchOtp: adminUser.modeSwitchOtp,
        modeSwitchOtpExpiresAt: adminUser.modeSwitchOtpExpiresAt,
      })
      .from(adminUser)
      .where(eq(adminUser.userId, session.user.id))
      .limit(1);

    if (!admin?.modeSwitchOtp || !admin.modeSwitchOtpExpiresAt) {
      return NextResponse.json(
        { error: "No verification code requested. Please request a new code." },
        { status: 403 }
      );
    }

    if (new Date() > admin.modeSwitchOtpExpiresAt) {
      // Clear expired OTP
      await db
        .update(adminUser)
        .set({ modeSwitchOtp: null, modeSwitchOtpExpiresAt: null })
        .where(eq(adminUser.userId, session.user.id));

      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 403 }
      );
    }

    // Hash submitted OTP and compare
    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (submittedHash !== admin.modeSwitchOtp) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 403 }
      );
    }

    // OTP is valid — clear it (one-time use)
    await db
      .update(adminUser)
      .set({ modeSwitchOtp: null, modeSwitchOtpExpiresAt: null })
      .where(eq(adminUser.userId, session.user.id));

    // ── Update model config ───────────────────────────────────────────────
    const [model] = await db
      .select()
      .from(aiModelConfig)
      .where(eq(aiModelConfig.slug, slug))
      .limit(1);

    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${slug}` },
        { status: 404 }
      );
    }

    // Merge useBatch into existing config JSONB
    const currentConfig = (model.config as Record<string, unknown>) ?? {};
    const updatedConfig = { ...currentConfig, useBatch };

    await db
      .update(aiModelConfig)
      .set({ config: updatedConfig, updatedAt: new Date() })
      .where(eq(aiModelConfig.slug, slug));

    return NextResponse.json({
      success: true,
      slug,
      useBatch,
      message: `${slug} set to ${useBatch ? "batch" : "real-time"} mode`,
    });
  } catch (error) {
    console.error("Model config update error:", error);
    return NextResponse.json(
      { error: "Failed to update model config" },
      { status: 500 }
    );
  }
}
