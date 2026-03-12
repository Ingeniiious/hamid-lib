import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  contributorVerification,
  userProfile,
  program,
  course,
} from "@/database/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";
import { ContributorVerification } from "@/components/ContributorVerification";
import { ContributeForm } from "@/components/ContributeForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute",
  description: "Submit your course documents to help build the Libraryyy community.",
};

type Props = {
  searchParams: Promise<{ courseId?: string }>;
};

export default async function ContributePage({ searchParams }: Props) {
  const [{ data: session }, { courseId }] = await Promise.all([
    auth.getSession(),
    searchParams,
  ]);
  if (!session?.user) redirect("/auth");

  const userId = session.user.id;

  // Single parallel batch: verification status + user profile
  const [verification, profile] = await Promise.all([
    db
      .select({ verifiedAt: contributorVerification.verifiedAt })
      .from(contributorVerification)
      .where(eq(contributorVerification.userId, userId))
      .limit(1),
    db
      .select({
        facultyId: userProfile.facultyId,
        programId: userProfile.programId,
      })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1),
  ]);

  const verified = !!verification[0];

  // Only fetch contribution context if verified
  let programs: { id: number; name: string }[] = [];
  let courses: { id: string; title: string }[] = [];
  let userProgramId: number | null = null;
  let userFacultyId: number | null = null;

  if (verified) {
    const facultyId = profile[0]?.facultyId ?? null;
    userProgramId = profile[0]?.programId ?? null;
    userFacultyId = facultyId;

    if (!facultyId) {
      // No faculty — flat list of all courses
      courses = await db
        .select({ id: course.id, title: course.title })
        .from(course)
        .orderBy(course.title)
        .limit(100);
    } else {
      // Fetch programs + courses in parallel
      const [progs, crses] = await Promise.all([
        db
          .select({ id: program.id, name: program.name })
          .from(program)
          .where(eq(program.facultyId, facultyId))
          .orderBy(program.name),
        userProgramId
          ? db
              .select({ id: course.id, title: course.title })
              .from(course)
              .where(eq(course.programId, userProgramId))
              .orderBy(course.title)
          : Promise.resolve([]),
      ]);
      programs = progs;
      courses = crses;
    }
  }

  const subtitleKey = verified
    ? "contribute.shareWithCommunity"
    : "contribute.verifyToStart";

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader titleKey="contribute.title" subtitleKey={subtitleKey} />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className={`mx-auto max-w-5xl ${verified ? "pt-8" : "flex min-h-full items-center justify-center"}`}>
          {verified ? (
            <ContributeForm
              programs={programs}
              courses={courses}
              userProgramId={userProgramId}
              userFacultyId={userFacultyId}
              initialCourseId={courseId}
            />
          ) : (
            <ContributorVerification />
          )}
        </div>
      </div>
      <BackButton href="/dashboard" labelKey="common.back" floating useBack />
    </div>
  );
}
