"use client";

import { useTranslation, changeLocaleAnimated, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES: { code: Locale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "tr", label: "Türkçe", short: "TR" },
  { code: "fa", label: "فارسی", short: "فا" },
];

export function LanguagePicker() {
  const { locale } = useTranslation();

  const handleSelect = (code: Locale) => {
    if (code !== locale) {
      changeLocaleAnimated(code);
      fetch("/api/profile/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      }).catch(() => {});
    }
  };

  const current = LANGUAGES.find((l) => l.code === locale)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full p-3 text-sm font-medium text-gray-900/70 transition-colors duration-300 hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
          aria-label="Change language"
        >
          {current.short}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[120px] rounded-xl border-gray-900/15 bg-white/70 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
      >
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`cursor-pointer justify-center rounded-lg text-center transition-colors ${
              locale === lang.code
                ? "font-medium text-[#5227FF] focus:text-[#5227FF] dark:text-[#8B6FFF] dark:focus:text-[#8B6FFF]"
                : "text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            }`}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
