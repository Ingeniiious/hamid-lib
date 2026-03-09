"use client";

import { Suspense } from "react";
import { PageTransition } from "@/components/PageTransition";
import {
  FloatingBackButtonProvider,
  FloatingBackButtonSlot,
} from "@/components/FloatingBackButton";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <FloatingBackButtonProvider>
      <Suspense fallback={<div className="h-full" />}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
      <FloatingBackButtonSlot />
    </FloatingBackButtonProvider>
  );
}
