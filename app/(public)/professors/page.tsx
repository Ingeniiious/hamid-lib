import { searchProfessors, getTopProfessors } from "./actions";
import { ProfessorSearch } from "@/components/professors/ProfessorSearch";
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
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-light tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Rate My Professor
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Search for a professor to see ratings and reviews from verified students
        </p>
      </div>

      <ProfessorSearch
        initialQuery={query}
        initialPage={page}
        searchResult={searchResult}
        topProfessors={topProfessors}
      />
    </div>
  );
}
