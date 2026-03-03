"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CourseDetailProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    professor: string | null;
    semester: string | null;
    major: string | null;
  };
}

export function CourseDetail({ course }: CourseDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-6"
    >
      <h1 className="text-center text-2xl font-medium text-foreground">
        {course.title}
      </h1>

      {course.description && (
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          {course.description}
        </p>
      )}

      <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        {course.professor && <span>{course.professor}</span>}
        {course.professor && course.semester && (
          <Separator orientation="vertical" className="h-4" />
        )}
        {course.semester && <span>{course.semester}</span>}
      </div>

      <Separator className="mx-auto mt-8 max-w-md" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Teaching", "Presentation", "Exam / Practice"].map((tab, i) => (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease, delay: 0.2 + i * 0.08 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{tab}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Coming Soon</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
