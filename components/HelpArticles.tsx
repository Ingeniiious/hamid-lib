"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { HELP_CATEGORIES, type HelpArticle } from "@/lib/help-articles";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const R2 = "https://lib.thevibecodedcompany.com/images";

/* ─── Hover overlays (same as FeatureCard / DashboardCard) ─── */

const GRAINIENT_BG =
  "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)";

const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ─── Article card (content-sized like FeatureCard — no forced aspect ratio) ─── */

function ArticleCard({
  article,
  index,
}: {
  article: HelpArticle;
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Link href={`/help/articles/${article.slug}`} className="block h-full">
        <div className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-gray-900/[0.06] bg-white/[0.03] backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02]">
          {/* Grainient hover overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
            style={{ background: GRAINIENT_BG }}
          />
          {/* Grain noise */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
            style={{ backgroundImage: GRAIN_SVG, backgroundSize: "128px 128px" }}
          />

          {/* Content — centered, content-driven height */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2.5 px-6 py-8 text-center sm:px-8 sm:py-10">
            <h3 className="font-display text-lg font-light text-gray-900 sm:text-xl dark:text-white">
              {t(article.titleKey)}
            </h3>
            <p
              className="max-w-xs text-sm leading-relaxed text-gray-900/50 dark:text-white/50"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t(article.descKey)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Category section ─── */

function CategorySection({
  titleKey,
  articles,
  catIndex,
}: {
  titleKey: string;
  articles: HelpArticle[];
  catIndex: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay: catIndex * 0.08, ease }}
      className="flex flex-col items-center"
    >
      <h2 className="text-center font-display text-xl font-light text-gray-900 sm:text-2xl dark:text-white">
        {t(titleKey)}
      </h2>

      <div className="mx-auto mt-6 grid w-full max-w-5xl auto-rows-[1fr] grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {articles.map((article, i) => (
          <ArticleCard
            key={article.slug}
            article={article}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */

export function HelpArticles() {
  const { t } = useTranslation();

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — fades grainient into solid background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col items-center">
        {/* Header — fixed at top */}
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-10 sm:pt-14">
          <PageHeader
            title={t("helpArticles.title")}
            subtitle={t("helpArticles.subtitle")}
          />
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 w-full flex-1 overflow-y-auto px-6 pb-24"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 32px)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 32px)",
          }}
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center pt-10">
            <div className="flex w-full flex-col items-center gap-14 sm:gap-20">
              {HELP_CATEGORIES.map((cat, i) => (
                <CategorySection
                  key={cat.titleKey}
                  titleKey={cat.titleKey}
                  articles={cat.articles}
                  catIndex={i}
                />
              ))}
            </div>

            {/* Back to help CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease }}
              className="mt-16 flex w-full flex-col items-center text-center sm:mt-20"
            >
              <Link
                href="/help"
                className="inline-block rounded-full bg-[#5227FF] px-10 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("helpArticles.backToHelp")}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating back button — same position as all other pages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start pb-6 pl-6 sm:justify-center sm:pl-0"
        >
          <Link
            href="/help"
            className="pointer-events-auto inline-flex items-center gap-2 transition-opacity hover:opacity-80 sm:-translate-x-[37vw]"
          >
            <img
              src={`${R2}/back.webp`}
              alt="Back"
              width={200}
              height={107}
              loading="eager"
              decoding="async"
              className="h-12 w-auto object-contain sm:h-14"
            />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
