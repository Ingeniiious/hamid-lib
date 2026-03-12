import { searchProfessors, getTopProfessors } from "./actions";
import { ProfessorSearch } from "@/components/professors/ProfessorSearch";
import { ProfessorsPageHeader } from "@/components/professors/ProfessorsPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rate My Professor",
  description:
    "Search and rate university professors. Read student reviews, see ratings, and share your experience.",
  openGraph: {
    title: "Rate My Professor | Libraryyy",
    description:
      "Search and rate university professors. Read student reviews, see ratings, and share your experience.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rate My Professor | Libraryyy",
    description:
      "Search and rate university professors. Read student reviews, see ratings, and share your experience.",
  },
};

export default async function ProfessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = Math.max(1, Number(params.page) || 1);

  const hasSearch = query.trim().length > 0;

  const [searchResult, topProfessors] = await Promise.all([
    hasSearch ? searchProfessors(query, page) : Promise.resolve(null),
    !hasSearch ? getTopProfessors(12) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <ProfessorsPageHeader />

      <ProfessorSearch
        initialQuery={query}
        initialPage={page}
        searchResult={searchResult}
        topProfessors={topProfessors}
      />
    </div>
  );
}
