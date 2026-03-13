import { NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { adminUser } from "@/database/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST — Generate and send a 6-digit OTP for mode switching.
 * OTP is valid for 5 minutes.
 */
export async function POST() {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Hash OTP before storing (SHA-256)
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  // Store hashed OTP in admin_user
  await db
    .update(adminUser)
    .set({
      modeSwitchOtp: otpHash,
      modeSwitchOtpExpiresAt: expiresAt,
    })
    .where(eq(adminUser.userId, session.user.id));

  // Send OTP via email
  const emailResult = await sendEmail({
    to: session.user.email,
    subject: "Libraryyy — Mode Switch Verification Code",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; text-align: center;">
        <h2 style="color: #5227FF;">Mode Switch Verification</h2>
        <p>Your verification code for switching AI pipeline mode:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #5227FF; padding: 20px; background: #f5f3ff; border-radius: 12px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 13px;">
          This code expires in 5 minutes.<br/>
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
    text: `Your Libraryyy mode switch verification code is: ${otp}. This code expires in 5 minutes.`,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent to your email",
    expiresAt: expiresAt.toISOString(),
  });
}
