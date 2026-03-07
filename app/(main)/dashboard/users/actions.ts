"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfile, contributorVerification } from "@/database/schema";
import { sendOTP, verifyOTP, type OTPType } from "@/app/(main)/auth/actions";

async function getSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");
  return session;
}

export async function updateName(name: string) {
  await getSession();

  try {
    const { error } = await auth.updateUser({ name: name.trim() });
    if (error) return { error: error.message || "Failed to update name." };
    return { success: true };
  } catch {
    return { error: "Failed to update name." };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  await getSession();

  try {
    const { error } = await auth.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (error) return { error: error.message || "Incorrect current password." };
    return { success: true };
  } catch {
    return { error: "Incorrect current password." };
  }
}

export async function listSessions() {
  await getSession();

  try {
    const { data, error } = await auth.listSessions();
    if (error || !data) return { sessions: [] };

    // Serialize to plain objects for the client
    const sessions = (Array.isArray(data) ? data : []).map((s: any) => ({
      id: s.id || "",
      token: s.token || "",
      userAgent: s.userAgent || null,
      ipAddress: s.ipAddress || null,
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : null,
      current: !!s.current,
    }));

    return { sessions };
  } catch {
    return { sessions: [] };
  }
}

export async function revokeSession(sessionToken: string) {
  await getSession();

  try {
    const { error } = await auth.revokeSession({ token: sessionToken });
    if (error) return { error: error.message || "Failed to revoke session." };
    return { success: true };
  } catch {
    return { error: "Failed to revoke session." };
  }
}

export async function revokeOtherSessions() {
  await getSession();

  try {
    const { error } = await auth.revokeOtherSessions();
    if (error)
      return { error: error.message || "Failed to revoke other sessions." };
    return { success: true };
  } catch {
    return { error: "Failed to revoke other sessions." };
  }
}

export async function sendDeleteOTP(password: string) {
  const session = await getSession();

  // Verify password first
  try {
    const { error } = await auth.signIn.email({
      email: session.user.email,
      password,
    });
    if (error) return { error: "Incorrect password." };
  } catch {
    return { error: "Incorrect password." };
  }

  // Send OTP for account deletion confirmation
  const result = await sendOTP(session.user.email, "account-deletion" as OTPType);
  if (result.error) return { error: result.error };

  return { success: true };
}

export async function getUserProfile() {
  const session = await getSession();
  const userId = session.user.id;
  try {
    const rows = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    return { profile: rows[0] || null };
  } catch {
    return { profile: null };
  }
}

export async function updateUserProfile(
  data: { university?: string; gender?: string; facultyId?: number | null; programId?: number | null; language?: string }
) {
  const session = await getSession();
  const userId = session.user.id;
  try {
    const existing = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);

    if (existing[0]) {
      await db
        .update(userProfile)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userProfile.userId, userId));
    } else {
      await db.insert(userProfile).values({
        userId,
        ...data,
      });
    }
    return { success: true };
  } catch {
    return { error: "Failed to update profile." };
  }
}

export async function getContributorInfo() {
  const session = await getSession();
  try {
    const rows = await db
      .select({
        universityEmail: contributorVerification.universityEmail,
        universityName: contributorVerification.universityName,
        verifiedAt: contributorVerification.verifiedAt,
      })
      .from(contributorVerification)
      .where(eq(contributorVerification.userId, session.user.id))
      .limit(1);

    if (!rows[0]) return { contributor: null };
    return {
      contributor: {
        universityEmail: rows[0].universityEmail,
        universityName: rows[0].universityName,
        verifiedAt: rows[0].verifiedAt.toISOString(),
      },
    };
  } catch {
    return { contributor: null };
  }
}

export async function confirmDeleteAccount(code: string) {
  const session = await getSession();

  // Verify the OTP
  const verification = await verifyOTP(
    session.user.email,
    code,
    "account-deletion" as OTPType
  );
  if (verification.error) return { error: verification.error };

  // Soft delete: ban the user so they can't log in, but data stays
  try {
    await (auth as any).admin.banUser({ userId: session.user.id });
    await auth.signOut();
    return { success: true };
  } catch {
    return { error: "Failed to delete account." };
  }
}
