"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
}

export function LanguageSelector({
  contentId,
  contentLanguage,
  availableTranslations,
  viewingTranslation,
  onSelectTranslation,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLanguages, setPendingLanguages] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  // If there are no other languages to show (content is in a language and there's nothing else), hide
  if (otherLanguages.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Original / Translated toggle */}
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

      {/* Language selector dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/50 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          {t("translate.contentInOtherLanguages")}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-2xl border border-gray-900/10 bg-white/95 p-2 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/95"
            >
              <div className="flex min-w-[180px] flex-col gap-1">
                {otherLanguages.map((lang) => {
                  const isAvailable = availableLangs.has(lang.code);
                  const isPending = pendingLanguages.has(lang.code);

                  return (
                    <button
                      key={lang.code}
                      onClick={() => !isPending && handleSelectLanguage(lang.code)}
                      disabled={isPending}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all hover:bg-gray-900/5 disabled:opacity-50 dark:hover:bg-white/5"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {lang.nativeLabel}
                      </span>
                      {isAvailable && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          {t("translate.available")}
                        </span>
                      )}
                      {isPending && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {t("translate.pending")}
                        </span>
                      )}
                      {!isAvailable && !isPending && (
                        <span className="text-[10px] text-gray-900/30 dark:text-white/30">
                          {t("translate.requestTranslation")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pending translation notification */}
      {pendingLanguages.size > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="text-center text-xs text-gray-900/40 dark:text-white/40"
        >
          {t("translate.translationRequested")} — {t("translate.checkBackSoon")}
        </motion.p>
      )}
    </div>
  );
}
