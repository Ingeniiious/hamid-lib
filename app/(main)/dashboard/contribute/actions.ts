"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  universityDomain,
  contributorVerification,
  contributorStats,
  userProfile,
  contribution,
  course,
  faculty,
  program,
} from "@/database/schema";
import { eq, sql, like, ilike, and, desc, inArray } from "drizzle-orm";
import { sendOTP, verifyOTP } from "@/app/(main)/auth/actions";

export async function getContributorStatus() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { verified: false };

  const rows = await db
    .select({ verifiedAt: contributorVerification.verifiedAt })
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);

  return { verified: !!rows[0], verifiedAt: rows[0]?.verifiedAt || null };
}

/**
 * Check email domain against our DB — optimized.
 *
 * For "stu.istinye.edu.tr" we build candidate list:
 *   ["stu.istinye.edu.tr", "istinye.edu.tr", "edu.tr"]
 * Then do a single exact-match IN() query — hits the unique index, no scan.
 */
async function matchUniversityDomainDB(emailDomain: string) {
  // Build all possible parent domains (most specific → least specific)
  const parts = emailDomain.split(".");
  const candidates: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i).join("."));
  }

  if (candidates.length === 0) return null;

  // Single query using the unique index on `domain`
  const matches = await db
    .select({ domain: universityDomain.domain, universityName: universityDomain.universityName })
    .from(universityDomain)
    .where(inArray(universityDomain.domain, candidates))
    .limit(1);

  return matches[0] || null;
}

/**
 * RDAP lookup — free API, no auth needed.
 * Checks if a domain is registered and returns registrant info.
 */
async function rdapLookup(domain: string): Promise<{ valid: boolean; orgName: string | null }> {
  try {
    // Strip subdomains to get the registrable root domain
    // e.g. stu.istinye.edu.tr → edu.tr won't work, we need istinye.edu.tr
    // Strategy: try the domain as-is first, then strip one subdomain at a time
    const parts = domain.split(".");
    const domainsToTry: string[] = [];

    // Try progressively shorter domains (skip single-part)
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (candidate.includes(".")) domainsToTry.push(candidate);
    }

    for (const tryDomain of domainsToTry) {
      try {
        const res = await fetch(`https://rdap.org/domain/${tryDomain}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;

        const data = await res.json();

        if (data.status && data.status.length > 0) {
          // Extract org name from vCard entities
          let orgName: string | null = null;
          for (const entity of data.entities || []) {
            if (entity.vcardArray?.[1]) {
              for (const field of entity.vcardArray[1]) {
                if (field[0] === "org" && field[3]) {
                  orgName = String(field[3]);
                  break;
                }
                if (field[0] === "fn" && field[3] && !orgName) {
                  orgName = String(field[3]);
                }
              }
            }
            if (orgName) break;
          }
          return { valid: true, orgName };
        }
      } catch {
        continue; // Try next subdomain level
      }
    }

    return { valid: false, orgName: null };
  } catch {
    // RDAP completely failed — fail open (don't block the user)
    return { valid: true, orgName: null };
  }
}

/**
 * Domain verification pipeline — always uses RDAP:
 * 1. Check our DB (10K+ domains, instant) → if found, done
 * 2. RDAP lookup to verify domain is real + get org name
 * 3. Save new domain to DB so next user skips the API call
 */
async function verifyUniversityDomain(email: string): Promise<{
  verified: boolean;
  universityName: string;
  newDomainSaved: boolean;
}> {
  const emailLower = email.toLowerCase().trim();
  const atIndex = emailLower.indexOf("@");
  if (atIndex === -1) return { verified: false, universityName: "Unknown", newDomainSaved: false };

  const emailDomain = emailLower.slice(atIndex + 1);

  // Step 1: Check our DB first (fast path)
  const dbMatch = await matchUniversityDomainDB(emailDomain);
  if (dbMatch) {
    return { verified: true, universityName: dbMatch.universityName, newDomainSaved: false };
  }

  // Step 2: Always do RDAP lookup for unknown domains
  const rdap = await rdapLookup(emailDomain);

  if (rdap.valid) {
    // Domain is registered — auto-verify + save to DB for future users
    const uniName = rdap.orgName || emailDomain;

    await db
      .insert(universityDomain)
      .values({ universityName: uniName, domain: emailDomain })
      .onConflictDoNothing();

    return { verified: true, universityName: uniName, newDomainSaved: true };
  }

  // RDAP says domain doesn't exist — something's off
  return { verified: false, universityName: "Unknown", newDomainSaved: false };
}

export async function sendContributorOTP(email: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Basic email validation only — no domain blocking
  const emailLower = email.toLowerCase().trim();
  if (!emailLower.includes("@") || !emailLower.includes(".")) {
    return { error: "Please enter a valid email address." };
  }

  // Check if already verified
  const existing = await db
    .select()
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (existing[0]) return { error: "You're already verified as a contributor." };

  // Always send OTP — domain check happens after verification
  const result = await sendOTP(email, "contributor-verification");
  if (result.error) return { error: result.error };

  return { success: true };
}

export async function verifyContributorOTP(email: string, code: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Verify OTP first — proves they own the email
  const result = await verifyOTP(email, code, "contributor-verification");
  if (result.error) return { error: result.error };

  // Check domain: DB first, then RDAP lookup, auto-save new domains
  const domainCheck = await verifyUniversityDomain(email);

  if (!domainCheck.verified) {
    // RDAP says domain doesn't exist — very suspicious
    return {
      success: true,
      autoVerified: false,
      message:
        "We couldn't verify this email domain. " +
        "If this is a valid university email, please contact us at hello@libraryyy.com.",
    };
  }

  // Domain verified (either from DB or RDAP) — grant access
  const universityName = domainCheck.universityName;

  await db
    .insert(contributorVerification)
    .values({
      userId: session.user.id,
      universityEmail: email.toLowerCase().trim(),
      universityName,
    })
    .onConflictDoNothing();

  await db
    .insert(contributorStats)
    .values({ userId: session.user.id })
    .onConflictDoNothing();

  await db
    .update(userProfile)
    .set({ contributorVerifiedAt: new Date() })
    .where(eq(userProfile.userId, session.user.id));

  return { success: true, autoVerified: true, universityName };
}

export async function submitTextContribution({
  courseId,
  title,
  textContent,
  description,
}: {
  courseId: string;
  title: string;
  textContent: string;
  description?: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Check verification
  const verified = await db
    .select()
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (!verified[0]) return { error: "Not verified as a contributor." };

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`contribute:${session.user.id}`, 20, 60);
  if (!rl.allowed) return { error: "Too many submissions. Please wait." };

  // Validate
  if (!title.trim()) return { error: "Title is required." };
  if (!textContent.trim()) return { error: "Content is required." };
  if (title.length > 200) return { error: "Title too long (max 200 chars)." };
  if (textContent.length > 50000) return { error: "Content too long (max 50,000 chars)." };

  // Check pending limit
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contribution)
    .where(
      and(
        eq(contribution.userId, session.user.id),
        eq(contribution.status, "pending")
      )
    );
  if (pending.count >= 20) {
    return { error: "You have too many pending contributions. Wait for review." };
  }

  // Insert
  const [row] = await db
    .insert(contribution)
    .values({
      userId: session.user.id,
      courseId: courseId || null,
      title: title.trim(),
      description: description?.trim() || null,
      type: "text",
      textContent: textContent.trim(),
    })
    .returning();

  // Update stats
  await db
    .update(contributorStats)
    .set({
      totalContributions: sql`${contributorStats.totalContributions} + 1`,
      lastContributionAt: new Date(),
      firstContributionAt: sql`COALESCE(${contributorStats.firstContributionAt}, NOW())`,
      updatedAt: new Date(),
    })
    .where(eq(contributorStats.userId, session.user.id));

  return { success: true, contributionId: row.id };
}

export async function getMyContributions(page = 1, limit = 10) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { contributions: [], total: 0 };

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contribution)
    .where(eq(contribution.userId, session.user.id));

  const rows = await db
    .select({
      id: contribution.id,
      title: contribution.title,
      description: contribution.description,
      type: contribution.type,
      fileName: contribution.fileName,
      status: contribution.status,
      reviewNote: contribution.reviewNote,
      createdAt: contribution.createdAt,
      courseTitle: course.title,
    })
    .from(contribution)
    .leftJoin(course, eq(contribution.courseId, course.id))
    .where(eq(contribution.userId, session.user.id))
    .orderBy(desc(contribution.createdAt))
    .limit(limit)
    .offset(offset);

  return { contributions: rows, total: countResult.count };
}

export async function getCoursesForContribution(facultySlug?: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { courses: [], facultyName: null, programName: null };

  // If a specific faculty was passed (user came from that faculty page), scope to it
  if (facultySlug) {
    const fac = await db
      .select({ id: faculty.id, name: faculty.name })
      .from(faculty)
      .where(eq(faculty.slug, facultySlug))
      .limit(1)
      .then((rows) => rows[0]);

    if (fac) {
      const courses = await db
        .select({ id: course.id, title: course.title })
        .from(course)
        .where(eq(course.facultyId, fac.id))
        .orderBy(course.title);
      return { courses, facultyName: fac.name, programName: null };
    }
  }

  // Use user's profile: try program first, then faculty
  const profile = await db
    .select({
      university: userProfile.university,
      facultyId: userProfile.facultyId,
      programId: userProfile.programId,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  // Priority 1: user's program — show only courses for their specific program
  if (profile[0]?.programId) {
    const prog = await db
      .select({ name: program.name })
      .from(program)
      .where(eq(program.id, profile[0].programId))
      .limit(1)
      .then((rows) => rows[0]);

    const courses = await db
      .select({ id: course.id, title: course.title })
      .from(course)
      .where(eq(course.programId, profile[0].programId))
      .orderBy(course.title);

    // If program has courses, return them
    if (courses.length > 0) {
      return { courses, facultyName: null, programName: prog?.name || null };
    }

    // Program has no courses yet — fall through to faculty level
  }

  // Priority 2: user's faculty
  if (profile[0]?.facultyId) {
    const fac = await db
      .select({ name: faculty.name })
      .from(faculty)
      .where(eq(faculty.id, profile[0].facultyId))
      .limit(1)
      .then((rows) => rows[0]);

    const courses = await db
      .select({ id: course.id, title: course.title })
      .from(course)
      .where(eq(course.facultyId, profile[0].facultyId))
      .orderBy(course.title);

    return { courses, facultyName: fac?.name || null, programName: null };
  }

  // No faculty/program set — return all courses
  const courses = await db
    .select({ id: course.id, title: course.title })
    .from(course)
    .orderBy(course.title)
    .limit(100);
  return { courses, facultyName: null, programName: null };
}

// ==================
// Contribution Context & Deduplication
// ==================

function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getContributionContext() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return null;

  const profile = await db
    .select({
      facultyId: userProfile.facultyId,
      programId: userProfile.programId,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  const facultyId = profile[0]?.facultyId || null;
  const userProgramId = profile[0]?.programId || null;

  if (!facultyId) {
    // No faculty — return flat list of all courses
    const allCourses = await db
      .select({ id: course.id, title: course.title })
      .from(course)
      .orderBy(course.title)
      .limit(100);
    return { programs: [], courses: allCourses, userProgramId: null, userFacultyId: null };
  }

  // Get programs for user's faculty
  const programs = await db
    .select({ id: program.id, name: program.name })
    .from(program)
    .where(eq(program.facultyId, facultyId))
    .orderBy(program.name);

  // Get courses for user's program (if set)
  let courses: { id: string; title: string }[] = [];
  if (userProgramId) {
    courses = await db
      .select({ id: course.id, title: course.title })
      .from(course)
      .where(eq(course.programId, userProgramId))
      .orderBy(course.title);
  }

  return { programs, courses, userProgramId, userFacultyId: facultyId };
}

export async function getCoursesForProgram(programId: number) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return [];

  return db
    .select({ id: course.id, title: course.title })
    .from(course)
    .where(eq(course.programId, programId))
    .orderBy(course.title);
}

export async function findOrCreateProgram(data: {
  name: string;
  facultyId: number;
}): Promise<{ id: number; name: string; error?: undefined } | { error: string }> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Contributor verification
  const [ver] = await db
    .select()
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (!ver) return { error: "Not verified as a contributor." };

  // Rate limit
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`find-or-create:${session.user.id}`, 30, 60);
  if (!rl.allowed) return { error: "Too many requests. Please wait a moment." };

  // Validate
  const trimmed = data.name.trim();
  if (!trimmed || trimmed.length < 2) return { error: "Program name is too short (min 2 characters)." };
  if (trimmed.length > 200) return { error: "Program name is too long (max 200 characters)." };

  const titleCased = toTitleCase(trimmed);

  // Exact case-insensitive match (no LIKE wildcards)
  const existing = await db
    .select({ id: program.id, name: program.name })
    .from(program)
    .where(
      and(
        eq(program.facultyId, data.facultyId),
        eq(sql`lower(${program.name})`, titleCased.toLowerCase())
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  // Create new program
  const slug = `${slugify(titleCased)}-${crypto.randomUUID().slice(0, 8)}`;
  const [row] = await db
    .insert(program)
    .values({
      name: titleCased,
      slug,
      facultyId: data.facultyId,
    })
    .returning({ id: program.id, name: program.name });

  return row;
}

export async function findOrCreateCourse(data: {
  name: string;
  programId: number;
  facultyId: number;
}): Promise<{ id: string; title: string; error?: undefined } | { error: string }> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Contributor verification
  const [ver] = await db
    .select()
    .from(contributorVerification)
    .where(eq(contributorVerification.userId, session.user.id))
    .limit(1);
  if (!ver) return { error: "Not verified as a contributor." };

  // Rate limit (shares bucket with findOrCreateProgram)
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`find-or-create:${session.user.id}`, 30, 60);
  if (!rl.allowed) return { error: "Too many requests. Please wait a moment." };

  // Validate
  const trimmed = data.name.trim();
  if (!trimmed || trimmed.length < 2) return { error: "Course name is too short (min 2 characters)." };
  if (trimmed.length > 200) return { error: "Course name is too long (max 200 characters)." };

  const titleCased = toTitleCase(trimmed);

  // Exact case-insensitive match (no LIKE wildcards)
  const existing = await db
    .select({ id: course.id, title: course.title })
    .from(course)
    .where(
      and(
        eq(course.programId, data.programId),
        eq(sql`lower(${course.title})`, titleCased.toLowerCase())
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  // Create new course
  const id = crypto.randomUUID();
  const slug = `${slugify(titleCased)}-${id.slice(0, 8)}`;
  await db.insert(course).values({
    id,
    title: titleCased,
    slug,
    facultyId: data.facultyId,
    programId: data.programId,
    createdBy: session.user.id,
  });

  return { id, title: titleCased };
}
