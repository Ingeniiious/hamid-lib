"use client";

import { CourseCard } from "@/components/CourseCard";

interface Course {
  id: string;
  title: string;
  slug: string | null;
  professor: string | null;
  semester: string | null;
}

interface CourseGridProps {
  courses: Course[];
  hrefPrefix?: string;
}

export function CourseGrid({ courses, hrefPrefix }: CourseGridProps) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, index) => (
        <CourseCard
          key={course.id}
          course={course}
          index={index}
          href={
            hrefPrefix
              ? `${hrefPrefix}/${course.slug || course.id}`
              : undefined
          }
        />
      ))}
    </div>
  );
}
