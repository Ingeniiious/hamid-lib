"use client";

import { useEffect, useRef } from "react";
import { useTranslation, type Locale } from "@/lib/i18n";

/**
 * Syncs the user's DB-stored language preference into the i18n context.
 * Placed in the dashboard layout so it runs on every authenticated page load.
 * This ensures language persists universally across devices — when a user
 * logs in on a new device, the DB value overrides the empty localStorage.
 *
 * Only syncs ONCE on mount. After that, local changes (via setLocale) take
 * precedence until the next full page load. This prevents the server-rendered
 * prop from reverting user-initiated language switches.
 */
export function LanguageSync({ language }: { language: string }) {
  const { setLocale } = useTranslation();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!hasSynced.current && language && ["en", "fa", "tr"].includes(language)) {
      setLocale(language as Locale);
      hasSynced.current = true;
    }
  }, [language, setLocale]);

  return null;
}
