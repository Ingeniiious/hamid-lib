"use client";

import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

export function PrivacyContent() {
  const { locale, t } = useTranslation();
  const titleDir = locale === "fa" ? "rtl" : undefined;

  return (
    <div className="relative h-full w-full">
      <BackButton href="/" floating useBack />

      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Fixed header */}
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-16 sm:pt-20">
          <PageHeader
            title={t("privacy.title")}
            subtitle={t("privacy.lastUpdated")}
          />
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
          }}
        >
          <article className="mx-auto max-w-2xl pt-8">
            <div className="space-y-8 text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s1Title")}
                </h2>
                <p className="mt-2">{t("privacy.s1P1")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    <strong>{t("privacy.s1Li1Label")}</strong>{" "}
                    {t("privacy.s1Li1Text")}
                  </li>
                  <li>
                    <strong>{t("privacy.s1Li2Label")}</strong>{" "}
                    {t("privacy.s1Li2Text")}
                  </li>
                  <li>
                    <strong>{t("privacy.s1Li3Label")}</strong>{" "}
                    {t("privacy.s1Li3Text")}
                  </li>
                  <li>
                    <strong>{t("privacy.s1Li4Label")}</strong>{" "}
                    {t("privacy.s1Li4Text")}
                  </li>
                </ul>
                <p className="mt-2">{t("privacy.s1P2")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    <strong>{t("privacy.s1Li5Label")}</strong>{" "}
                    {t("privacy.s1Li5Text")}
                  </li>
                  <li>
                    <strong>{t("privacy.s1Li6Label")}</strong>{" "}
                    {t("privacy.s1Li6Text")}
                  </li>
                </ul>
                <p className="mt-2">{t("privacy.s1P3")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s2Title")}
                </h2>
                <p className="mt-2">{t("privacy.s2P1")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>{t("privacy.s2Li1")}</li>
                  <li>{t("privacy.s2Li2")}</li>
                  <li>{t("privacy.s2Li3")}</li>
                  <li>{t("privacy.s2Li4")}</li>
                  <li>{t("privacy.s2Li5")}</li>
                  <li>{t("privacy.s2Li6")}</li>
                  <li>{t("privacy.s2Li7")}</li>
                  <li>{t("privacy.s2Li8")}</li>
                </ul>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s3Title")}
                </h2>
                <p className="mt-2">{t("privacy.s3P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s4Title")}
                </h2>
                <p className="mt-2">{t("privacy.s4P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s5Title")}
                </h2>
                <p className="mt-2">{t("privacy.s5P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s6Title")}
                </h2>
                <p className="mt-2">{t("privacy.s6P1")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>{t("privacy.s6Li1")}</li>
                  <li>{t("privacy.s6Li2")}</li>
                  <li>{t("privacy.s6Li3")}</li>
                  <li>{t("privacy.s6Li4")}</li>
                </ul>
                <p className="mt-2">{t("privacy.s6P2")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s7Title")}
                </h2>
                <p className="mt-2">{t("privacy.s7P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s8Title")}
                </h2>
                <p className="mt-2">{t("privacy.s8P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s9Title")}
                </h2>
                <p className="mt-2">{t("privacy.s9P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("privacy.s10Title")}
                </h2>
                <p className="mt-2">
                  {t("privacy.s10P1")}{" "}
                  <a
                    href="mailto:hello@libraryyy.com"
                    className="text-[#5227FF] underline underline-offset-2"
                  >
                    hello@libraryyy.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </article>
        </div>

        <BackButton href="/auth" label={t("common.back")} floating closeTab />
      </div>
    </div>
  );
}
