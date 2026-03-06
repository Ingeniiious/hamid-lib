"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ProfessorCard } from "./ProfessorCard";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type ProfessorSummary = {
  id: number;
  name: string;
  slug: string;
  university: string;
  department: string | null;
  rating: { avg: number; count: number; wouldTakeAgain: number };
};

type SearchResult = {
  professors: ProfessorSummary[];
  total: number;
  totalPages: number;
} | null;

export function ProfessorSearch({
  initialQuery,
  initialPage,
  searchResult,
  topProfessors,
}: {
  initialQuery: string;
  initialPage: number;
  searchResult: SearchResult;
  topProfessors: ProfessorSummary[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.push(`/professors?${params.toString()}`);
    });
  }

  const professors = searchResult?.professors ?? topProfessors;
  const showingSearch = !!searchResult;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto mb-8 max-w-lg"
      >
        <Input
          type="search"
          placeholder="Search by professor name, university, or department..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-11 rounded-lg bg-white/80 text-base shadow-sm backdrop-blur dark:bg-gray-900/80"
        />
      </motion.div>

      {isPending && (
        <div className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Searching...
        </div>
      )}

      {showingSearch && searchResult && (
        <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {searchResult.total} professor{searchResult.total !== 1 ? "s" : ""} found
        </p>
      )}

      {!showingSearch && professors.length > 0 && (
        <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Top Rated Professors
        </p>
      )}

      {professors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="py-20 text-center"
        >
          <p className="text-lg text-gray-500 dark:text-gray-400">
            No professors found
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Try a different search term
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professors.map((prof, i) => (
            <ProfessorCard key={prof.id} professor={prof} index={i} />
          ))}
        </div>
      )}

      {showingSearch && searchResult && searchResult.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {initialPage > 1 && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                params.set("page", String(initialPage - 1));
                startTransition(() => router.push(`/professors?${params.toString()}`));
              }}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Previous
            </button>
          )}
          <span className="px-3 text-sm text-gray-600 dark:text-gray-400">
            Page {initialPage} of {searchResult.totalPages}
          </span>
          {initialPage < searchResult.totalPages && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                params.set("page", String(initialPage + 1));
                startTransition(() => router.push(`/professors?${params.toString()}`));
              }}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Next
            </button>
          )}
        </div>
      )}
    </>
  );
}
