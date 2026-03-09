"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const BACK_IMG = "https://lib.thevibecodedcompany.com/images/back.webp";

// ── Types ───────────────────────────────────────────────

interface BackButtonConfig {
  href: string;
  label: string;
  useBack?: boolean;
  closeTab?: boolean;
}

interface ContextValue {
  config: BackButtonConfig | null;
  set: (c: BackButtonConfig) => void;
  clear: () => void;
}

// ── Context ─────────────────────────────────────────────

const Ctx = createContext<ContextValue>({
  config: null,
  set: () => {},
  clear: () => {},
});

// ── Provider ────────────────────────────────────────────

export function FloatingBackButtonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<BackButtonConfig | null>(null);
  const lastSetRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = useCallback((c: BackButtonConfig) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    lastSetRef.current = Date.now();
    setConfig(c);
  }, []);

  const clear = useCallback(() => {
    const t = lastSetRef.current;
    clearTimerRef.current = setTimeout(() => {
      if (lastSetRef.current === t) setConfig(null);
    }, 100);
  }, []);

  return (
    <Ctx.Provider value={{ config, set, clear }}>{children}</Ctx.Provider>
  );
}

// ── Setter — pages render this to declare their back button ──

export function FloatingBackButtonSetter({
  href,
  label,
  useBack,
  closeTab,
}: BackButtonConfig) {
  const { set, clear } = useContext(Ctx);

  useEffect(() => {
    set({ href, label, useBack, closeTab });
    return () => clear();
  }, [href, label, useBack, closeTab, set, clear]);

  return null;
}

// ── Slot — rendered in layout, outside PageTransition ───

export function FloatingBackButtonSlot() {
  const { config } = useContext(Ctx);
  const [imgFailed, setImgFailed] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (config?.useBack) {
      e.preventDefault();
      router.back();
    } else if (config?.closeTab) {
      e.preventDefault();
      window.close();
      if (config.href) router.push(config.href);
    }
  };

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          key="floating-back"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start pb-6 pl-6 sm:justify-center sm:pl-0"
        >
          <Link
            href={config.href}
            onClick={handleClick}
            className="pointer-events-auto inline-flex items-center gap-2 transition-opacity hover:opacity-80 sm:-translate-x-[37vw]"
          >
            {!imgFailed ? (
              <img
                src={BACK_IMG}
                alt="Back"
                width={200}
                height={107}
                loading="eager"
                decoding="async"
                onError={() => setImgFailed(true)}
                className="h-12 w-auto object-contain sm:h-14"
              />
            ) : (
              <span className="rounded-full border border-gray-900/10 bg-white/70 px-5 py-2 text-sm text-gray-900/60 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                ← {config.label}
              </span>
            )}
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
