"use client";

import { PageTransition } from "@/components/PageTransition";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
