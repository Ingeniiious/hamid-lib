import { HelpArticles } from "@/components/HelpArticles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Articles — Libraryyy",
  description:
    "Everything you need to know about Libraryyy — detailed guides on courses, exams, contributions, AI teachers, professor ratings, and more.",
  openGraph: {
    title: "Help Articles — Libraryyy",
    description:
      "Everything you need to know about Libraryyy — detailed guides on courses, exams, contributions, AI teachers, professor ratings, and more.",
  },
  twitter: {
    card: "summary",
    title: "Help Articles — Libraryyy",
    description:
      "Everything you need to know about Libraryyy — detailed guides on courses, exams, contributions, AI teachers, professor ratings, and more.",
  },
};

export default function HelpArticlesPage() {
  return <HelpArticles />;
}
