"use client";

import { useContext, useRef, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { setLocaleTransitionHandler } from "@/lib/i18n";

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
  const localeControls = useAnimation();

  useEffect(() => {
    localeControls.set({ opacity: 1 });

    setLocaleTransitionHandler(async (applyChange) => {
      // Fade out current content
      await localeControls.start({ opacity: 0, transition: { duration: 0.25, ease } });
      // Apply locale change (components re-render with new language while invisible)
      applyChange();
      // Brief pause for React to process
      await new Promise((r) => setTimeout(r, 30));
      // Fade in new content
      await localeControls.start({ opacity: 1, transition: { duration: 0.35, ease } });
    });

    return () => setLocaleTransitionHandler(null);
  }, [localeControls]);

  // Reset locale wrapper opacity on route change
  useEffect(() => {
    localeControls.set({ opacity: 1 });
  }, [pathname, localeControls]);

  return (
    <motion.div animate={localeControls} className="h-full">
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
    </motion.div>
  );
}
