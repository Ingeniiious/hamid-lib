"use server";

import { randomInt, randomBytes } from "crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { db } from "@/lib/db";
import { emailVerification, userProfile, faculty, program } from "@/database/schema";
import { eq, and, gt, sql, asc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { getEmailTemplate } from "@/lib/email-templates";

export type OTPType = "signup" | "password-reset" | "account-deletion";

export async function sendOTP(email: string, type: OTPType = "signup") {
  const otp = randomInt(100000, 999999).toString();

  // Remove any existing OTPs for this email + type
  await db
    .delete(emailVerification)
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.type, type)
      )
    );

  // Store new OTP (expires in 90 seconds)
  const expiresAt = new Date(Date.now() + 90 * 1000);
  await db.insert(emailVerification).values({
    email,
    otpCode: otp,
    type,
    expiresAt,
  });

  // Look up user name for personalized greeting (password resets)
  let recipientName: string | undefined;
  if (type === "password-reset") {
    try {
      const rows = await db.execute<{ name: string }>(
        sql`SELECT name FROM neon_auth."user" WHERE email = ${email} LIMIT 1`
      );
      recipientName = rows[0]?.name || undefined;
    } catch {
      // Ignore — greeting will fall back to "Hey there,"
    }
  }

  const templateMap = {
    signup: "signup-otp",
    "password-reset": "password-reset-otp",
    "account-deletion": "account-deletion-otp",
  } as const;
  const templateType = templateMap[type];
  const { subject, html, text } = getEmailTemplate(templateType, {
    code: otp,
    name: recipientName,
  });

  const result = await sendEmail({ to: email, subject, html, text });

  if (!result.success) {
    return { error: "Failed to send verification email." };
  }

  return { success: true };
}

export async function verifyOTP(
  email: string,
  code: string,
  type: OTPType = "signup"
) {
  const records = await db
    .select()
    .from(emailVerification)
    .where(
      and(
        eq(emailVerification.email, email),
        eq(emailVerification.type, type),
        gt(emailVerification.expiresAt, new Date())
      )
    )
    .limit(1);

  const record = records[0];

  if (!record) {
    return { error: "Code expired. Please request a new one." };
  }

  if (record.attempts >= 5) {
    await db
      .delete(emailVerification)
      .where(eq(emailVerification.id, record.id));
    return { error: "Too many attempts. Please request a new code." };
  }

  if (record.otpCode !== code) {
    await db
      .update(emailVerification)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerification.id, record.id));
    return { error: "Invalid code. Please try again." };
  }

  // OTP verified — clean up
  await db
    .delete(emailVerification)
    .where(eq(emailVerification.id, record.id));

  return { success: true };
}

export async function sendPasswordResetOTP(email: string) {
  // Check if user exists — but always return success to prevent enumeration
  try {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM neon_auth."user" WHERE email = ${email} LIMIT 1`
    );

    if (!rows[0]) {
      // User doesn't exist, but don't reveal this
      return { success: true };
    }
  } catch {
    return { success: true };
  }

  const result = await sendOTP(email, "password-reset");
  return result;
}

function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(16);
  const derived = scrypt(password, salt, { N: 16384, r: 16, p: 1, dkLen: 64 });
  return `${bytesToHex(salt)}:${bytesToHex(derived)}`;
}

export async function getFacultiesForUniversity(universityName: string) {
  try {
    const rows = await db
      .select({ id: faculty.id, name: faculty.name, slug: faculty.slug })
      .from(faculty)
      .where(eq(faculty.university, universityName))
      .orderBy(asc(faculty.displayOrder));
    return { faculties: rows };
  } catch {
    return { faculties: [] };
  }
}

export async function getProgramsForFaculty(facultyId: number) {
  try {
    const rows = await db
      .select({ id: program.id, name: program.name, slug: program.slug })
      .from(program)
      .where(eq(program.facultyId, facultyId))
      .orderBy(asc(program.displayOrder));
    return { programs: rows };
  } catch {
    return { programs: [] };
  }
}

export async function saveUserProfile(
  userId: string,
  university: string,
  gender: string,
  facultyId?: number | null,
  programId?: number | null
) {
  try {
    await db.insert(userProfile).values({
      userId,
      university,
      gender,
      facultyId: facultyId ?? null,
      programId: programId ?? null,
    });
    return { success: true };
  } catch {
    return { error: "Failed to save profile." };
  }
}

export async function resetPasswordWithOTP(
  email: string,
  code: string,
  newPassword: string
) {
  // Verify the OTP first
  const verification = await verifyOTP(email, code, "password-reset");
  if (verification.error) {
    return { error: verification.error };
  }

  // Hash the new password using the same scrypt params as Better Auth
  const hashedPassword = hashPasswordScrypt(newPassword);

  // Update the password directly in neon_auth.account
  try {
    await db.execute(
      sql`UPDATE neon_auth.account SET password = ${hashedPassword} WHERE "userId" IN (
        SELECT id FROM neon_auth."user" WHERE email = ${email}
      ) AND "providerId" = 'credential'`
    );
  } catch {
    return { error: "Failed to reset password." };
  }

  return { success: true };
}
