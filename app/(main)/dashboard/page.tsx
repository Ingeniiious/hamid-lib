import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { redirect } from "next/navigation";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { CourseCard } from "@/components/CourseCard";
import { MajorDivider } from "@/components/MajorDivider";
import { CourseGrid } from "@/components/CourseGrid";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session) redirect("/auth");

  const courses = await db
    .select()
    .from(course)
    .orderBy(course.major, course.title);

  // Group courses by major
  const grouped: Record<string, (typeof courses)[number][]> = {};
  for (const c of courses) {
    const major = c.major || "General";
    if (!grouped[major]) grouped[major] = [];
    grouped[major].push(c);
  }

  const userName = session.user?.name || "Student";

  return (
    <>
      <DashboardTopBar userName={userName} />

      <div className="mx-auto max-w-5xl px-6 pb-12 pt-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <h2 className="text-xl font-medium text-foreground">
              No Courses Yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Courses will appear here once they&apos;re added.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([major, majorCourses]) => (
            <div key={major} className="mt-8 first:mt-0">
              <MajorDivider name={major} />
              <CourseGrid courses={majorCourses} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
