"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string | null;
    professor: string | null;
    semester: string | null;
  };
  index: number;
  href?: string;
}

export function CourseCard({ course, index, href }: CourseCardProps) {
  const link = href ?? `/course/${course.slug || course.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={link}>
        <Card className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {course.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {course.professor && (
              <p className="text-sm text-muted-foreground">
                {course.professor}
              </p>
            )}
            {course.semester && (
              <p className="text-xs text-muted-foreground/70">
                {course.semester}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
