"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sendOTP, verifyOTP } from "@/app/(main)/auth/actions";

export async function sendDestructiveOTP() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) redirect("/auth");

  return sendOTP(session.user.email, "admin-action");
}

export async function verifyDestructiveOTP(code: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) redirect("/auth");

  return verifyOTP(session.user.email, code, "admin-action");
}
