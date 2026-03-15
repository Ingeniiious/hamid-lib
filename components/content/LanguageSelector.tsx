"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const LANGUAGES: { code: string; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
];

interface AvailableTranslation {
  language: string;
  content: unknown;
  title: string;
}

interface LanguageSelectorProps {
  contentId: string;
  contentLanguage: string;
  availableTranslations: AvailableTranslation[];
  viewingTranslation: string | null;
  onSelectTranslation: (language: string | null) => void;
  compact?: boolean;
}

export function LanguageSelector({
  contentId,
  contentLanguage,
  availableTranslations,
  viewingTranslation,
  onSelectTranslation,
  compact = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLanguages, setPendingLanguages] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click (check both trigger and portaled dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Poll for pending translations
  useEffect(() => {
    if (pendingLanguages.size === 0) return;

    const interval = setInterval(async () => {
      for (const lang of pendingLanguages) {
        try {
          const res = await fetch(
            `/api/translations/status?contentId=${contentId}&targetLanguage=${lang}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.status === "completed") {
              setPendingLanguages((prev) => {
                const next = new Set(prev);
                next.delete(lang);
                return next;
              });
              // Refresh the page to get updated translations from server
              window.location.reload();
            }
          }
        } catch {
          // Ignore poll errors
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingLanguages, contentId]);

  const availableLangs = new Set(availableTranslations.map((t) => t.language));

  // Other languages (exclude the content's own language)
  const otherLanguages = LANGUAGES.filter((l) => l.code !== contentLanguage);

  const handleRequestTranslation = useCallback(async (langCode: string) => {
    setPendingLanguages((prev) => new Set(prev).add(langCode));
    setIsOpen(false);

    try {
      await fetch("/api/translations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          targetLanguage: langCode,
          mode: "instant",
        }),
      });
    } catch {
      // Request failed — keep pending state, user can try again
    }
  }, [contentId]);

  const handleSelectLanguage = (langCode: string) => {
    if (availableLangs.has(langCode)) {
      onSelectTranslation(langCode);
      setIsOpen(false);
    } else {
      handleRequestTranslation(langCode);
    }
  };

  // If there are no other languages to show, hide
  if (otherLanguages.length === 0) return null;

  // Shared dropdown content — rendered via portal to escape overflow-hidden ancestors
  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <DropdownPortal triggerRef={dropdownRef} portalRef={portalRef}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            className="rounded-2xl border border-gray-900/10 bg-white/95 p-2 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95"
          >
            <div className="flex min-w-[180px] flex-col gap-1">
              {/* Back to original option (if viewing translation) */}
              {viewingTranslation && (
                <button
                  onClick={() => { onSelectTranslation(null); setIsOpen(false); }}
                  className="flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-[#5227FF] transition-all hover:bg-gray-900/5 dark:text-[#8B6FFF] dark:hover:bg-white/5"
                >
                  {t("translate.original")}
                </button>
              )}
              {otherLanguages.map((lang) => {
                const isAvailable = availableLangs.has(lang.code);
                const isPending = pendingLanguages.has(lang.code);
                const isViewing = viewingTranslation === lang.code;

                return (
                  <button
                    key={lang.code}
                    onClick={() => !isPending && handleSelectLanguage(lang.code)}
                    disabled={isPending}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all hover:bg-gray-900/5 disabled:opacity-50 dark:hover:bg-white/5 ${
                      isViewing ? "bg-[#5227FF]/5 dark:bg-[#5227FF]/10" : ""
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang.nativeLabel}
                    </span>
                    {isPending && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        {t("translate.pending")}
                      </span>
                    )}
                    {isAvailable && !isViewing && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                        {t("translate.available")}
                      </span>
                    )}
                    {!isAvailable && !isPending && (
                      <span className="text-[10px] text-gray-900/50 dark:text-white/50">
                        {t("translate.requestTranslation")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </DropdownPortal>
      )}
    </AnimatePresence>
  );

  // Compact mode: animated cycling button with dropdown
  if (compact) {
    return (
      <CompactTranslateButton
        dropdownRef={dropdownRef}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        viewingTranslation={viewingTranslation}
        dropdownContent={dropdownContent}
        t={t}
      />
    );
  }

  // Full mode (legacy)
  return (
    <div className="flex flex-col items-center gap-2">
      {viewingTranslation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => onSelectTranslation(null)}
            className="rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/60 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
          >
            {t("translate.original")}
          </button>
          <span className="rounded-full bg-[#5227FF]/10 px-4 py-1.5 text-xs font-medium text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]">
            {t("translate.translatedTo")} {LANGUAGES.find((l) => l.code === viewingTranslation)?.nativeLabel ?? viewingTranslation}
          </span>
        </motion.div>
      )}

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/80 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
        >
          {t("translate.contentInOtherLanguages")}
        </button>
        {dropdownContent}
      </div>

      {pendingLanguages.size > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="text-center text-xs text-gray-900/40 dark:text-white/40"
        >
          {t("translate.translationRequested")} · {t("translate.checkBackSoon")}
        </motion.p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompactTranslateButton — uses same SmoothLabel pattern as SubscribeButton
// ---------------------------------------------------------------------------

const SPRING = { type: "spring" as const, stiffness: 600, damping: 30 };

function CompactTranslateButton({
  dropdownRef,
  isOpen,
  setIsOpen,
  viewingTranslation,
  dropdownContent,
  t,
}: {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  viewingTranslation: string | null;
  dropdownContent: React.ReactNode;
  t: (key: string) => string;
}) {
  const [textIndex, setTextIndex] = useState(0);
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);

  const cycleTexts = [
    t("translate.requestTranslation"),
    t("translate.contentInOtherLanguages"),
  ];

  // Cycle text every 4 seconds — pause when viewing a translation or dropdown is open
  useEffect(() => {
    if (viewingTranslation || isOpen) return;
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % cycleTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [viewingTranslation, isOpen, cycleTexts.length]);

  const displayText = viewingTranslation
    ? LANGUAGES.find((l) => l.code === viewingTranslation)?.nativeLabel ?? viewingTranslation
    : cycleTexts[textIndex];

  // Measure width on text change
  useEffect(() => {
    if (measureRef.current) {
      setWidth(measureRef.current.getBoundingClientRect().width);
    }
  }, [displayText]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative overflow-hidden rounded-full transition-all ${
          viewingTranslation
            ? "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
            : "border border-gray-900/10 bg-white/50 text-gray-900/80 backdrop-blur-xl hover:shadow-md dark:border-white/15 dark:bg-white/5 dark:text-white/80"
        }`}
      >
        <span className="relative flex items-center justify-center" style={{ padding: "8px 20px" }}>
          {/* Invisible measurer */}
          <span ref={measureRef} className="absolute invisible whitespace-nowrap text-sm font-medium">
            {displayText}
          </span>

          {/* Animated width container */}
          <motion.span
            animate={{ width: typeof width === "number" ? width : undefined }}
            transition={SPRING}
            className="relative flex items-center justify-center overflow-hidden"
            style={{ height: 20 }}
          >
            <AnimatePresence mode="sync" initial={false}>
              <motion.span
                key={displayText}
                className="whitespace-nowrap text-sm font-medium leading-none text-current"
                initial={{ y: -14, opacity: 0, filter: "blur(6px)", position: "absolute" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)", position: "relative" }}
                exit={{ y: 14, opacity: 0, filter: "blur(6px)", position: "absolute" }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
              >
                {displayText}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </span>
      </button>
      {dropdownContent}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DropdownPortal — renders dropdown in document.body, positioned below trigger
// ---------------------------------------------------------------------------

function DropdownPortal({
  triggerRef,
  portalRef,
  children,
}: {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, [triggerRef]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={(node) => { portalRef.current = node; }}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
    >
      {children}
    </div>,
    document.body,
  );
}
