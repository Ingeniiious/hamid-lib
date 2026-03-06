"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminUser } from "@/database/schema";
import { eq } from "drizzle-orm";
import { sendOTP, verifyOTP } from "@/app/(main)/auth/actions";

export async function sendAdminOTP() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) redirect("/auth");

  return sendOTP(session.user.email, "admin-login");
}

export async function verifyAdminOTP(code: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) redirect("/auth");

  const result = await verifyOTP(session.user.email, code, "admin-login");
  if (result.error) return result;

  // Update OTP verified timestamp
  await db
    .update(adminUser)
    .set({ otpVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(adminUser.userId, session.user.id));

  return { success: true };
}
