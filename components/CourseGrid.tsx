"use client";

import { CourseCard } from "@/components/CourseCard";

interface Course {
  id: string;
  title: string;
  slug: string | null;
  professor: string | null;
  semester: string | null;
}

export function CourseGrid({ courses }: { courses: Course[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, index) => (
        <CourseCard key={course.id} course={course} index={index} />
      ))}
    </div>
  );
}
