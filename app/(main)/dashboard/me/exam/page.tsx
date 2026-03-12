import { ExamResultsContent } from "@/components/ExamResultsContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exam Results",
  description: "View your exam scores and practice history.",
};

export default function ExamResultsPage() {
  return <ExamResultsContent />;
}
