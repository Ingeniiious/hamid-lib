import { HelpContent } from "@/components/HelpContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How To Use Libraryyy",
  description:
    "Learn how to use Libraryyy — browse courses, contribute materials, practice exams, and rate professors.",
  openGraph: {
    title: "How To Use Libraryyy",
    description:
      "Learn how to use Libraryyy — browse courses, contribute materials, practice exams, and rate professors.",
  },
  twitter: {
    card: "summary",
    title: "How To Use Libraryyy",
    description:
      "Learn how to use Libraryyy — browse courses, contribute materials, practice exams, and rate professors.",
  },
};

export default function HelpPage() {
  return <HelpContent />;
}
