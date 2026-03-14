import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ALL_ARTICLES, getArticleBySlug } from "@/lib/help-articles";
import { HelpArticleView } from "@/components/HelpArticleView";

/* ─── Static params for all 19 articles ─── */

export function generateStaticParams() {
  return ALL_ARTICLES.map((a) => ({ slug: a.slug }));
}

/* ─── SEO metadata ─── */

// Static English titles for metadata (translations are client-side only)
const STATIC_TITLES: Record<string, string> = {
  "create-account": "Create Your Account",
  "university-setup": "Set Up Your University",
  "personalize": "Personalize Your Experience",
  "navigate-dashboard": "Navigate The Dashboard",
  "my-space": "My Space",
  "presentations": "Presentations & Sharing",
  "support": "Get Support",
  "browse-courses": "Browse Courses",
  "course-content": "Course Content & Study Materials",
  "mock-exams": "Mock Exams & Question Types",
  "grading-and-results": "Grading & Results",
  "how-to-contribute": "How To Contribute",
  "moderation-process": "Moderation Process",
  "core-contributor": "Become A Core Contributor",
  "meet-the-teachers": "Meet The Teachers",
  "how-content-is-created": "How Content Is Created",
  "challenge-content": "Challenge Content",
  "find-a-professor": "Find & Rate Professors",
  "write-a-review": "Write A Review",
};

const STATIC_DESCS: Record<string, string> = {
  "create-account": "Sign up with your email and get instant access to all courses and study materials.",
  "university-setup": "Select your university, faculty, and program to see courses relevant to your studies.",
  "personalize": "Choose your language and theme to make Libraryyy feel like home.",
  "navigate-dashboard": "Learn how to use the dashboard to find courses, track progress, and manage your studies.",
  "my-space": "Your personal workspace for notes, mind maps, and task tracking.",
  "presentations": "Upload presentations and share them instantly using portal codes.",
  "support": "Submit a support ticket and get help from the Libraryyy team.",
  "browse-courses": "Find courses by faculty, search by name, and explore what's available for your major.",
  "course-content": "Teaching materials, study guides, flashcards, and 12 content types — all created by our AI teachers.",
  "mock-exams": "Practice with seven question formats — multiple choice, essay, math, and more — graded instantly.",
  "grading-and-results": "AI-powered grading with detailed feedback and score tracking for every exam attempt.",
  "how-to-contribute": "Upload your course documents in any format to help build the library for thousands of students.",
  "moderation-process": "Every contribution is reviewed and verified before being used to create original study content.",
  "core-contributor": "Professors and active contributors can earn Core Contributor status with priority moderation.",
  "meet-the-teachers": "Our teaching council is a team of 5 specialized AI teachers who create, review, and verify all content.",
  "how-content-is-created": "Student contributions go through a 5-step review process producing 12 types of study content.",
  "challenge-content": "Found an error? Challenge any published content and our teaching council will re-evaluate it.",
  "find-a-professor": "Search professors by name, read reviews, compare ratings, and plan your semester strategically.",
  "write-a-review": "Rate professors anonymously with verified reviews — only real students can submit feedback.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const title = `${STATIC_TITLES[slug] || slug} — Libraryyy`;
  const description = STATIC_DESCS[slug] || "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "Libraryyy — Your University Course Library",
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg"],
    },
  };
}

/* ─── Page ─── */

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return <HelpArticleView slug={slug} />;
}
