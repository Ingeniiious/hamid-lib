import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { CourseDetail } from "@/components/CourseDetail";
import { unslugify } from "@/lib/slugify";
import type { Metadata } from "next";

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
    description: c.description || `${c.title} on Libraryyy`,
    openGraph: {
      title: `${c.title} | Libraryyy`,
      description: c.description || `${c.title} on Libraryyy`,
    },
    robots: { index: false },
  };
}

export default async function CoursePage({ params }: Props) {
  const { majorSlug, courseSlug } = await params;

  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) notFound();

  const majorName = unslugify(majorSlug);

  return (
    <div className="mx-auto max-w-5xl px-6 pb-12">
      <BackButton
        href={`/dashboard/courses/${majorSlug}`}
        label={majorName}
      />

      <PageHeader title={c.title} subtitle={c.description || undefined} />

      <CourseDetail course={c} />
    </div>
  );
}
