"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface MajorCardProps {
  name: string;
  slug: string;
  courseCount: number;
  index: number;
}

export function MajorCard({ name, slug, courseCount, index }: MajorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={`/dashboard/${slug}`}>
        <Card className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {courseCount} {courseCount === 1 ? "Course" : "Courses"}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
