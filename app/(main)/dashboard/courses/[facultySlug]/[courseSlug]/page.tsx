import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { course, faculty, userProfile, generatedContent, contentTranslation } from "@/database/schema";
import { notFound } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { CourseDetail } from "@/components/CourseDetail";
import { isSubscribed } from "@/lib/subscriptions";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ facultySlug: string; courseSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facultySlug, courseSlug } = await params;
  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) {
    return { title: "Course Not Found", robots: { index: false } };
  }

  const description = c.description || `${c.title} — study resources on Libraryyy`;
  const pageUrl = `/dashboard/courses/${facultySlug}/${courseSlug}`;

  return {
    title: c.title,
    description,
    openGraph: {
      title: `${c.title} | Libraryyy`,
      description,
      url: pageUrl,
      siteName: "Libraryyy",
      type: "website",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${c.title} — Libraryyy`,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${c.title} | Libraryyy`,
      description,
      images: ["/og-image.jpg"],
    },
  };
}

export default async function CoursePage({ params }: Props) {
  const { facultySlug, courseSlug } = await params;

  const courses = await db
    .select()
    .from(course)
    .where(eq(course.slug, courseSlug));

  const c = courses[0];
  if (!c) notFound();

  // Get faculty name for back button
  const fac = await db
    .select({ name: faculty.name })
    .from(faculty)
    .where(eq(faculty.slug, facultySlug))
    .then((rows) => rows[0]);

  // Fetch published content + user info in parallel
  let isContributor = false;
  let subscribed = false;

  const publishedContentRows = await db
    .select()
    .from(generatedContent)
    .where(
      and(
        eq(generatedContent.courseId, c.id),
        eq(generatedContent.isPublished, true),
      ),
    )
    .orderBy(generatedContent.contentType, generatedContent.displayOrder, generatedContent.createdAt);

  // Fetch completed translations for all published content
  const contentIds = publishedContentRows.map((r) => r.id);
  const translationRows = contentIds.length > 0
    ? await db
        .select()
        .from(contentTranslation)
        .where(
          and(
            inArray(contentTranslation.contentId, contentIds),
            eq(contentTranslation.status, "completed"),
          ),
        )
    : [];

  // Group translations by contentId
  const availableTranslations: Record<string, { language: string; content: unknown; title: string }[]> = {};
  for (const t of translationRows) {
    if (!availableTranslations[t.contentId]) {
      availableTranslations[t.contentId] = [];
    }
    availableTranslations[t.contentId].push({
      language: t.targetLanguage,
      content: t.content ?? t.richText,
      title: t.title,
    });
  }

  try {
    const { data: session } = await auth.getSession();
    if (session?.user?.id) {
      const [profile, subStatus] = await Promise.all([
        db
          .select({ contributorVerifiedAt: userProfile.contributorVerifiedAt })
          .from(userProfile)
          .where(eq(userProfile.userId, session.user.id))
          .limit(1),
        isSubscribed("course", c.id),
      ]);
      isContributor = !!profile[0]?.contributorVerifiedAt;
      subscribed = subStatus;
    }
  } catch {
    // Ignore
  }

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title={c.title} subtitle={c.description || undefined} />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          <CourseDetail
            course={c}
            isContributor={isContributor}
            facultySlug={facultySlug}
            initialSubscribed={subscribed}
            publishedContent={publishedContentRows}
            availableTranslations={availableTranslations}
          />
        </div>
      </div>
      <BackButton
        href={`/dashboard/courses/${facultySlug}`}
        label={fac?.name || "Back"}
        floating
      />
    </div>
  );
}
