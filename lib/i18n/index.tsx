"use client";

import {
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";
import { en, type TranslationKeys } from "./translations/en";
import { fa } from "./translations/fa";
import { tr } from "./translations/tr";

export type Locale = "en" | "fa" | "tr";

const STORAGE_KEY = "hamid-lib-lang";
const VALID_LOCALES = new Set<string>(["en", "fa", "tr"]);

const translations: Record<Locale, TranslationKeys> = { en, fa, tr };

/** Resolve a dot-notation key like "common.save" from a translation object */
function resolve(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

// ─── Module-level external store ─────────────────────────────────────────────
// Using a plain variable + subscriber set instead of React context.
// useSyncExternalStore guarantees synchronous, tear-free reads — every
// component that calls useTranslation() re-renders instantly on locale change.

let currentLocale: Locale = "en";
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return "en";
}

/** Sync <html lang> attribute — layout stays LTR for all languages */
function syncHtmlLang(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

/** Update locale, persist to localStorage, and notify all subscribers */
function changeLocale(newLocale: Locale) {
  if (newLocale === currentLocale) return;
  currentLocale = newLocale;
  try {
    localStorage.setItem(STORAGE_KEY, newLocale);
  } catch {
    // localStorage unavailable
  }
  syncHtmlLang(newLocale);
  emitChange();
}

// ─── Animated locale transitions ──────────────────────────────────────────────
// Allows PageTransition to orchestrate fade-out → locale change → fade-in,
// preventing the visual race condition where content updates before animation.

type TransitionHandler = (applyChange: () => void) => Promise<void>;
let transitionHandler: TransitionHandler | null = null;

/** Register a handler that wraps locale changes in an animation sequence */
export function setLocaleTransitionHandler(handler: TransitionHandler | null) {
  transitionHandler = handler;
}

/** Change locale with animated transition (fade out → switch → fade in) */
export function changeLocaleAnimated(newLocale: Locale): Promise<void> {
  if (newLocale === currentLocale) return Promise.resolve();
  const apply = () => changeLocale(newLocale);
  if (transitionHandler) {
    return transitionHandler(apply);
  }
  apply();
  return Promise.resolve();
}

// Initialise from localStorage on client (runs once when module loads)
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_LOCALES.has(saved)) {
      currentLocale = saved as Locale;
    }
  } catch {
    // localStorage unavailable
  }
  // Sync <html lang> on initial load
  syncHtmlLang(currentLocale);

  // Sync across browser tabs
  window.addEventListener("storage", (e) => {
    if (
      e.key === STORAGE_KEY &&
      e.newValue &&
      VALID_LOCALES.has(e.newValue)
    ) {
      currentLocale = e.newValue as Locale;
      syncHtmlLang(currentLocale);
      emitChange();
    }
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTranslation() {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const t = useCallback(
    (key: string): string => {
      const result = resolve(translations[locale], key);
      // Fallback to English if key not found in current locale
      if (result === key && locale !== "en") {
        return resolve(translations.en, key);
      }
      return result;
    },
    [locale],
  );

  return { locale, setLocale: changeLocale, t };
}

/**
 * Resolve a DB field from a JSONB translations column.
 * Usage: localized(locale, faculty.name, faculty.translations, "name")
 * Falls back to the source value if no translation exists.
 */
export function localized(
  locale: Locale,
  sourceValue: string,
  translations: Record<string, Record<string, string | undefined>> | null | undefined,
  field: string,
): string {
  if (!translations || locale === "en") return sourceValue;
  return translations[locale]?.[field] || sourceValue;
}

// ─── Provider (pass-through — keeps layout.tsx import compatible) ────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
