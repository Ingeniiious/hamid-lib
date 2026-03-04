import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { notFound } from "next/navigation";
import { CourseGrid } from "@/components/CourseGrid";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { unslugify } from "@/lib/slugify";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ majorSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { majorSlug } = await params;
  const majorName = unslugify(majorSlug);

  return {
    title: majorName,
    description: `${majorName} courses on Libraryyy`,
    openGraph: {
      title: `${majorName} | Libraryyy`,
      description: `Browse ${majorName} courses`,
    },
    robots: { index: false },
  };
}

export default async function MajorCoursesPage({ params }: Props) {
  const { majorSlug } = await params;
  const majorName = unslugify(majorSlug);

  // Find courses whose major matches (case-insensitive)
  const allCourses = await db
    .select()
    .from(course)
    .orderBy(course.title);

  const majorCourses = allCourses.filter(
    (c) => (c.major || "General").toLowerCase() === majorName.toLowerCase()
  );

  if (majorCourses.length === 0) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 pb-12">
      <BackButton href="/dashboard/courses" label="All Majors" />

      <PageHeader
        title={majorName}
        subtitle={`${majorCourses.length} ${majorCourses.length === 1 ? "Course" : "Courses"}`}
      />

      <CourseGrid
        courses={majorCourses}
        hrefPrefix={`/dashboard/courses/${majorSlug}`}
      />
    </div>
  );
}
