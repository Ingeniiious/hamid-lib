"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { getArticleBySlug, HELP_CATEGORIES } from "@/lib/help-articles";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const R2 = "https://lib.thevibecodedcompany.com/images";

/* ─── Lazy-loaded demo components per article ─── */

const SignUpDemo = dynamic(() => import("@/components/help/SignUpDemo").then((m) => ({ default: m.SignUpDemo })), { ssr: false });
const UniversitySetupDemo = dynamic(() => import("@/components/help/UniversitySetupDemo").then((m) => ({ default: m.UniversitySetupDemo })), { ssr: false });
const PersonalizeDemo = dynamic(() => import("@/components/help/PersonalizeDemo").then((m) => ({ default: m.PersonalizeDemo })), { ssr: false });
const BrowseDemo = dynamic(() => import("@/components/help/BrowseDemo").then((m) => ({ default: m.BrowseDemo })), { ssr: false });
const MySpaceDemo = dynamic(() => import("@/components/help/MySpaceDemo").then((m) => ({ default: m.MySpaceDemo })), { ssr: false });
const PresentationsDemo = dynamic(() => import("@/components/help/PresentationsDemo").then((m) => ({ default: m.PresentationsDemo })), { ssr: false });
const SupportDemo = dynamic(() => import("@/components/help/SupportDemo").then((m) => ({ default: m.SupportDemo })), { ssr: false });
const ExamDemo = dynamic(() => import("@/components/help/ExamDemo").then((m) => ({ default: m.ExamDemo })), { ssr: false });
const ContributeDemo = dynamic(() => import("@/components/help/ContributeDemo").then((m) => ({ default: m.ContributeDemo })), { ssr: false });
const ModerationDemo = dynamic(() => import("@/components/help/ModerationDemo").then((m) => ({ default: m.ModerationDemo })), { ssr: false });
const CoreContributorDemo = dynamic(() => import("@/components/help/CoreContributorDemo").then((m) => ({ default: m.CoreContributorDemo })), { ssr: false });
const AICouncilDemo = dynamic(() => import("@/components/help/AICouncilDemo").then((m) => ({ default: m.AICouncilDemo })), { ssr: false });
const ChallengeContentDemo = dynamic(() => import("@/components/help/ChallengeContentDemo").then((m) => ({ default: m.ChallengeContentDemo })), { ssr: false });
const RateProfessorDemo = dynamic(() => import("@/components/help/RateProfessorDemo").then((m) => ({ default: m.RateProfessorDemo })), { ssr: false });
const PortalDemo = dynamic(() => import("@/components/help/PortalDemo").then((m) => ({ default: m.PortalDemo })), { ssr: false });
const MyStudiesDemo = dynamic(() => import("@/components/help/MyStudiesDemo").then((m) => ({ default: m.MyStudiesDemo })), { ssr: false });

const SLUG_DEMO: Record<string, React.ComponentType> = {
  "create-account": SignUpDemo,
  "university-setup": UniversitySetupDemo,
  "personalize": PersonalizeDemo,
  "navigate-dashboard": BrowseDemo,
  "my-space": MySpaceDemo,
  "presentations": PresentationsDemo,
  "portal": PortalDemo,
  "my-studies": MyStudiesDemo,
  "support": SupportDemo,
  "browse-courses": BrowseDemo,
  "course-content": BrowseDemo,
  "mock-exams": ExamDemo,
  "grading-and-results": ExamDemo,
  "how-to-contribute": ContributeDemo,
  "moderation-process": ModerationDemo,
  "core-contributor": CoreContributorDemo,
  "meet-the-teachers": AICouncilDemo,
  "how-content-is-created": AICouncilDemo,
  "challenge-content": ChallengeContentDemo,
  "find-a-professor": RateProfessorDemo,
  "write-a-review": RateProfessorDemo,
};

/* ─── Hover overlays (same as FeatureCard) ─── */

const GRAINIENT_BG =
  "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)";

const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function HelpArticleView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const article = getArticleBySlug(slug);
  if (!article) return null;

  // Find sibling articles in same category
  const category = HELP_CATEGORIES.find(
    (c) => c.titleKey === article.category
  );
  const siblings = category?.articles.filter((a) => a.slug !== slug) ?? [];

  // Split body text into paragraphs (separated by \n\n in translations)
  const bodyText = t(article.bodyKey);
  const paragraphs = bodyText.split("\n\n").filter(Boolean);

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — fades grainient into solid background (same as HelpContent) */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Header — fixed at top */}
        <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pt-10 sm:pt-14">
          <PageHeader
            title={t(article.titleKey)}
            subtitle={t(article.descKey)}
          />
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 32px)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 32px)",
          }}
        >
          <div className="mx-auto max-w-3xl pt-8">
            {/* Category badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease }}
              className="text-center"
            >
              <span className="inline-block rounded-full bg-[#5227FF]/8 px-4 py-1.5 text-xs font-medium text-[#5227FF] dark:bg-[#5227FF]/15 dark:text-[#a78bfa]">
                {t(article.category)}
              </span>
            </motion.div>

            {/* Demo animation */}
            {SLUG_DEMO[slug] && (() => {
              const Demo = SLUG_DEMO[slug];
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1, ease }}
                  className="mx-auto mt-8 max-w-md"
                >
                  <Demo />
                </motion.div>
              );
            })()}

            {/* Article body — glass card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease }}
              className="mx-auto mt-8 max-w-2xl"
            >
              <div className="overflow-hidden rounded-3xl border border-gray-900/[0.06] bg-white/50 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="px-8 py-10 sm:px-12 sm:py-14">
                  <div className="space-y-5">
                    {paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-center text-base leading-relaxed text-gray-900/70 dark:text-white/70"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Related articles */}
            {siblings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3, ease }}
                className="mx-auto mt-16 max-w-2xl"
              >
                <h3 className="text-center font-display text-lg font-light text-gray-900 sm:text-xl dark:text-white">
                  {t("helpArticles.relatedArticles")}
                </h3>

                <div
                  className={`mt-6 ${
                    siblings.length <= 2
                      ? "flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-3"
                  }`}
                >
                  {siblings.map((a, i) => (
                    <motion.div
                      key={a.slug}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 + i * 0.1, ease }}
                      whileHover={{ scale: 1.02 }}
                      className={siblings.length <= 2 ? "w-full sm:w-56" : "h-full"}
                    >
                      <Link
                        href={`/help/articles/${a.slug}`}
                        className="group relative block h-full overflow-hidden rounded-2xl border border-gray-900/[0.06] bg-white/[0.03] backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02]"
                      >
                        {/* Grainient hover */}
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                          style={{ background: GRAINIENT_BG }}
                        />
                        <div
                          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
                          style={{ backgroundImage: GRAIN_SVG, backgroundSize: "128px 128px" }}
                        />

                        <div className="relative z-10 p-5 text-center">
                          <h4 className="font-display text-sm font-light text-gray-900 dark:text-white">
                            {t(a.titleKey)}
                          </h4>
                          <p className="mt-1 text-xs text-gray-900/50 dark:text-white/50">
                            {t(a.descKey)}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Back to articles CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="mt-12 flex justify-center sm:mt-16"
            >
              <Link
                href="/help/articles"
                className="inline-block rounded-full bg-[#5227FF] px-10 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("helpArticles.viewAllArticles")}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating back button — same as HelpContent */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start pb-6 pl-6 sm:justify-center sm:pl-0"
        >
          <Link
            href="/help/articles"
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
