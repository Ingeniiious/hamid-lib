"use client";

import { useContext, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * Freezes the router context so children don't update during the exit animation.
 * Without this, React swaps children immediately and AnimatePresence can't fade out the old content.
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease }}
        className="h-full"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  );
}
