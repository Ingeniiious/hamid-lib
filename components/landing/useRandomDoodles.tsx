"use client";

import { createContext, useContext, useState, useEffect } from "react";

// ── Context for coordinated doodle allocation ──

const DoodleCtx = createContext<string[][]>([]);

/**
 * Shuffles the doodle pool once per page load and deals out
 * non-overlapping slices to each section — guarantees fair spread
 * while staying random.
 */
export function DoodleProvider({
  pool,
  counts,
  children,
}: {
  pool: readonly string[];
  counts: number[];
  children: React.ReactNode;
}) {
  // Start with empty slices (SSR-safe — doodles fade in via Framer Motion)
  const [slices, setSlices] = useState<string[][]>(() =>
    counts.map(() => []),
  );

  useEffect(() => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const result: string[][] = [];
    let idx = 0;
    for (const count of counts) {
      result.push(shuffled.slice(idx, idx + count));
      idx += count;
    }
    setSlices(result);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <DoodleCtx.Provider value={slices}>{children}</DoodleCtx.Provider>;
}

/** Get the pre-allocated doodle slice for a section by index. */
export function useDoodleSlice(sectionIndex: number): string[] {
  return useContext(DoodleCtx)[sectionIndex] ?? [];
}
