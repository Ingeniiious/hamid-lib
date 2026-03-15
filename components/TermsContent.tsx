"use client";

import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

export function TermsContent() {
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
            title={t("terms.title")}
            subtitle={t("terms.lastUpdated")}
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
                  {t("terms.s1Title")}
                </h2>
                <p className="mt-2">{t("terms.s1P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s2Title")}
                </h2>
                <p className="mt-2">{t("terms.s2P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s3Title")}
                </h2>
                <p className="mt-2">{t("terms.s3P1")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>{t("terms.s3Li1")}</li>
                  <li>{t("terms.s3Li2")}</li>
                  <li>{t("terms.s3Li3")}</li>
                  <li>{t("terms.s3Li4")}</li>
                  <li>{t("terms.s3Li5")}</li>
                </ul>
                <p className="mt-2">{t("terms.s3P2")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s4Title")}
                </h2>
                <p className="mt-2">{t("terms.s4P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s5Title")}
                </h2>
                <p className="mt-2">{t("terms.s5P1")}</p>
                <p className="mt-2">{t("terms.s5P2")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s6Title")}
                </h2>
                <p className="mt-2">{t("terms.s6P1")}</p>
                <p className="mt-2">{t("terms.s6P2")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s7Title")}
                </h2>
                <p className="mt-2">{t("terms.s7P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s8Title")}
                </h2>
                <p className="mt-2">{t("terms.s8P1")}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>{t("terms.s8Li1")}</li>
                  <li>{t("terms.s8Li2")}</li>
                  <li>{t("terms.s8Li3")}</li>
                  <li>{t("terms.s8Li4")}</li>
                  <li>{t("terms.s8Li5")}</li>
                </ul>
                <p className="mt-2">{t("terms.s8P2")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s9Title")}
                </h2>
                <p className="mt-2">{t("terms.s9P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s10Title")}
                </h2>
                <p className="mt-2">{t("terms.s10P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s11Title")}
                </h2>
                <p className="mt-2">{t("terms.s11P1")}</p>
              </section>

              <section>
                <h2 dir={titleDir} className="font-display text-lg font-light text-gray-900 dark:text-white">
                  {t("terms.s12Title")}
                </h2>
                <p className="mt-2">
                  {t("terms.s12P1")}{" "}
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
