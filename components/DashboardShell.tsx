"use client";

import { PageTransition } from "@/components/PageTransition";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
