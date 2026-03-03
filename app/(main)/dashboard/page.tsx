import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { course } from "@/database/schema";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { MajorCard } from "@/components/MajorCard";
import { slugify } from "@/lib/slugify";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session) redirect("/auth");

  const majors = await db
    .select({
      major: course.major,
      count: sql<number>`count(*)::int`,
    })
    .from(course)
    .groupBy(course.major)
    .orderBy(course.major);

  const userName = session.user?.name || "Student";

  return (
    <>
      <DashboardTopBar userName={userName} />

      <div className="mx-auto max-w-5xl px-6 pb-12 pt-4">
        {majors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <h2 className="text-xl font-medium text-foreground">
              No Courses Yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Courses will appear here once they&apos;re added.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {majors.map((m, index) => (
              <MajorCard
                key={m.major}
                name={m.major || "General"}
                slug={slugify(m.major || "general")}
                courseCount={m.count}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
