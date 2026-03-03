import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { BackButton } from "@/components/BackButton";
import { CourseDetail } from "@/components/CourseDetail";
import { unslugify } from "@/lib/slugify";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ majorSlug: string; courseSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) {
    return { title: "Course Not Found", robots: { index: false } };
  }

  return {
    title: c.title,
    description: c.description || `${c.title} on Hamid Library`,
    openGraph: {
      title: `${c.title} | Hamid Library`,
      description: c.description || `${c.title} on Hamid Library`,
    },
    robots: { index: false },
  };
}

export default async function CoursePage({ params }: Props) {
  const { majorSlug, courseSlug } = await params;
  const { data: session } = await auth.getSession();
  if (!session) redirect("/auth");

  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) notFound();

  const majorName = unslugify(majorSlug);
  const userName = session.user?.name || "Student";

  return (
    <>
      <DashboardTopBar userName={userName} />

      <div className="mx-auto max-w-5xl px-6 pb-12 pt-4">
        <BackButton
          href={`/dashboard/${majorSlug}`}
          label={majorName}
        />

        <CourseDetail course={c} />
      </div>
    </>
  );
}
