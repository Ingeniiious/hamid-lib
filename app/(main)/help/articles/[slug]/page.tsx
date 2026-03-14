import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ALL_ARTICLES, getArticleBySlug } from "@/lib/help-articles";
import { HelpArticleView } from "@/components/HelpArticleView";

/* ─── Static params for all 24 articles ─── */

export function generateStaticParams() {
  return ALL_ARTICLES.map((a) => ({ slug: a.slug }));
}

/* ─── SEO metadata ─── */

// Static English titles for metadata (translations are client-side only)
const STATIC_TITLES: Record<string, string> = {
  "create-account": "Create Your Account",
  "navigate-dashboard": "Navigate The Dashboard",
  "choose-language": "Choose Your Language",
  "dark-mode": "Dark Mode",
  "browse-courses": "Browse Courses",
  "course-content": "Course Content",
  "study-materials": "Study Materials",
  "track-progress": "Track Your Progress",
  "mock-exams": "Mock Exams",
  "question-types": "Question Types",
  "essay-grading": "Essay Grading",
  "exam-results": "Exam Results",
  "how-to-contribute": "How To Contribute",
  "file-formats": "Supported Formats",
  "moderation-process": "Moderation Process",
  "core-contributor": "Become A Core Contributor",
  "meet-the-teachers": "Meet The Teachers",
  "how-content-is-created": "How Content Is Created",
  "content-types": "Content Types",
  "challenge-content": "Challenge Content",
  "find-a-professor": "Find A Professor",
  "write-a-review": "Write A Review",
  "verified-reviews": "Verified Reviews",
  "choose-your-professor": "Choose Your Professor",
};

const STATIC_DESCS: Record<string, string> = {
  "create-account": "Sign up with your university email and get instant access to all courses and study materials.",
  "navigate-dashboard": "Learn how to use the dashboard to find courses, track progress, and manage your studies.",
  "choose-language": "Switch between English, Persian, and Turkish at any time from the settings page.",
  "dark-mode": "Toggle between light and dark themes to match your preference and reduce eye strain.",
  "browse-courses": "Find courses by faculty, search by name, and explore what's available for your major.",
  "course-content": "Each course has teaching materials, presentations, and practice exams — all created by our teachers.",
  "study-materials": "Access study guides, flashcards, mind maps, and more — original content verified by our teaching council.",
  "track-progress": "See your scores, improvement over time, and compare your performance across different courses.",
  "mock-exams": "Take unique mock exams created by our teachers. At least 5 unique versions per course, with more on request.",
  "question-types": "Multiple choice, essay, mathematical equations — our exams cover every format your university uses.",
  "essay-grading": "Submit essay answers and receive detailed feedback from our teaching council within minutes.",
  "exam-results": "Get instant scores with detailed breakdowns. Track your improvement and identify weak areas.",
  "how-to-contribute": "Upload your course documents to help build the library. Your contributions help thousands of students.",
  "file-formats": "We accept PDF, DOCX, PPTX, images, and even handwritten notes — our system handles them all.",
  "moderation-process": "Every contribution is reviewed and verified before being used to create original study content.",
  "core-contributor": "Professors and active contributors can earn Core Contributor status with priority moderation.",
  "meet-the-teachers": "Our teaching council is a team of 5 specialized teachers who create, review, and verify all content.",
  "how-content-is-created": "Student contributions go through a 5-step review process. Each teacher independently verifies the content.",
  "content-types": "Study guides, flashcards, quizzes, podcasts, mind maps, infographics — our teachers create it all.",
  "challenge-content": "Found an error? Challenge any published content and our teaching council will re-evaluate it.",
  "find-a-professor": "Search for professors by name, university, or course. See ratings and reviews from verified students.",
  "write-a-review": "Rate your professors on quality, difficulty, and more. All reviews are anonymous and moderated.",
  "verified-reviews": "Only students who attended a professor's class can submit reviews — ensuring authentic feedback.",
  "choose-your-professor": "Use ratings and reviews to make informed decisions when choosing classes and professors.",
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
