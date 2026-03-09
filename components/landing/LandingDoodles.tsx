"use client";

import { DOODLE_POOL } from "./landing-constants";
import { DoodleProvider } from "./useRandomDoodles";

// Doodle counts per section (order matches page layout):
// 0: HeroBook (3)  1: Book (2)  2: CutMat (2)  3: Checklist (3)  4: Footer (2)
const SECTION_COUNTS = [3, 2, 2, 3, 2];

export function LandingDoodles({ children }: { children: React.ReactNode }) {
  return (
    <DoodleProvider pool={DOODLE_POOL} counts={SECTION_COUNTS}>
      {children}
    </DoodleProvider>
  );
}
