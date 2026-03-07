import { notFound } from "next/navigation";
import { getProfessorBySlug } from "../actions";
import { ProfessorProfile } from "@/components/professors/ProfessorProfile";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prof = await getProfessorBySlug(slug);
  if (!prof) return { title: "Professor Not Found" };

  const description = `${prof.name} at ${prof.university}${prof.department ? ` — ${prof.department}` : ""}. ${prof.stats.reviewCount} student review${prof.stats.reviewCount !== 1 ? "s" : ""}${prof.stats.avgOverall ? `, rated ${prof.stats.avgOverall}/5` : ""}.`;

  return {
    title: `${prof.name} — ${prof.university}`,
    description,
    openGraph: {
      title: `${prof.name} — ${prof.university} | Libraryyy`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${prof.name} — ${prof.university} | Libraryyy`,
      description,
    },
  };
}

export default async function ProfessorPage({ params }: Props) {
  const { slug } = await params;
  const prof = await getProfessorBySlug(slug);
  if (!prof) notFound();

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: prof.name,
    jobTitle: "Professor",
    worksFor: {
      "@type": "Organization",
      name: prof.university,
    },
    ...(prof.department && { department: prof.department }),
    ...(prof.stats.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: prof.stats.avgOverall,
        bestRating: 5,
        worstRating: 1,
        ratingCount: prof.stats.reviewCount,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <ProfessorProfile professor={prof} />
      </div>
    </>
  );
}
