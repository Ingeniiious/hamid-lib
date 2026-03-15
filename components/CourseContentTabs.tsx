"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContentRenderer } from "@/components/content/ContentRenderer";
import { LanguageSelector } from "@/components/content/LanguageSelector";
import { OptionPicker } from "@/components/OptionPicker";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const TEACHER_NAMES: Record<string, string> = {
  kimi: "Luna",
  chatgpt: "Atlas",
  claude: "Nova",
  gemini: "Sage",
  grok: "Echo",
};

// ---------------------------------------------------------------------------
// VariantPicker — dropdown with title label + help modal explaining AI teachers
// ---------------------------------------------------------------------------

const R2_TEACHERS = "https://lib.thevibecodedcompany.com/images/teachers";

const TEACHER_INFO: { slug: string; name: string; descKey: string }[] = [
  { slug: "kimi", name: "Luna", descKey: "teacherLuna" },
  { slug: "chatgpt", name: "Atlas", descKey: "teacherAtlas" },
  { slug: "claude", name: "Nova", descKey: "teacherNova" },
  { slug: "gemini", name: "Sage", descKey: "teacherSage" },
  { slug: "grok", name: "Echo", descKey: "teacherEcho" },
];

function VariantPicker({
  items,
  activeIndex,
  onSelect,
}: {
  items: PublishedContentItem[];
  activeIndex: number;
  onSelect: (idx: number) => void;
}) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease }}
      className="space-y-2"
    >
      {/* Label + help button */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-medium text-gray-900/40 dark:text-white/40">
          {t("courseContent.createdBy")}
        </span>
        <button
          onClick={() => setHelpOpen(true)}
          className="rounded-full border border-gray-900/10 px-2 py-0.5 text-[10px] font-medium text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900/60 dark:border-white/10 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/60"
        >
          {t("courseContent.whatIsThis")}
        </button>
      </div>

      {/* Teacher avatar grid */}
      <div className="flex items-center justify-center gap-3">
        {items.map((item, idx) => {
          const isActive = activeIndex === idx;
          const slug = item.modelSource ?? "";
          const teacherName = TEACHER_NAMES[slug] ?? `${t("courseContent.variant")} ${idx + 1}`;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelect(idx)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2, ease }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`relative h-10 w-10 overflow-hidden rounded-full border-2 transition-all duration-200 ${
                isActive
                  ? "border-[#5227FF] shadow-md shadow-[#5227FF]/20 dark:border-[#8B6FFF]"
                  : "border-gray-900/10 opacity-50 hover:opacity-80 dark:border-white/15"
              }`}>
                <img
                  src={`${R2_TEACHERS}/${slug}.webp`}
                  alt={teacherName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-[#5227FF] dark:text-[#8B6FFF]"
                  : "text-gray-900/40 dark:text-white/40"
              }`}>
                {teacherName}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Help modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-lg font-light">
              {t("courseContent.aiTeachersTitle")}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-900/50 dark:text-white/50">
              {t("courseContent.aiTeachersDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
            {TEACHER_INFO.map((teacher, i) => (
              <motion.div
                key={teacher.slug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease, delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-gray-900/10 bg-gray-900/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <img
                    src={`${R2_TEACHERS}/${teacher.slug}.webp`}
                    alt={teacher.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 text-center">
                  <p className="text-xs font-medium text-[#5227FF] dark:text-[#8B6FFF]">
                    {teacher.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-900/60 dark:text-white/60">
                    {t(`courseContent.${teacher.descKey}`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Tab → content type mapping
const TAB_CONTENT_TYPES: Record<string, string[]> = {
  learn: ["study_guide", "interactive_section", "slide_deck", "report"],
  practice: ["flashcards", "quiz", "mind_map", "data_table", "infographic_data"],
  exam: ["mock_exam"],
  media: ["podcast_script", "video_script"],
};

// Content type display label keys (i18n)
const CONTENT_TYPE_LABELS: Record<string, string> = {
  study_guide: "studyGuide",
  flashcards: "flashcards",
  quiz: "quiz",
  mock_exam: "mockExam",
  podcast_script: "podcastScript",
  video_script: "videoScript",
  mind_map: "mindMap",
  infographic_data: "infographic",
  slide_deck: "slideDeck",
  data_table: "dataTable",
  report: "report",
  interactive_section: "interactiveSection",
};

export interface PublishedContentItem {
  id: string;
  courseId: string;
  contentType: string;
  title: string;
  description: string | null;
  content: unknown;
  richText: string | null;
  language: string;
  modelSource: string | null;
  version: number;
  displayOrder: number;
  mediaUrl: string | null;
  mediaType: string | null;
}

export interface AvailableTranslation {
  language: string;
  content: unknown;
  title: string;
}

interface CourseContentTabsProps {
  publishedContent: PublishedContentItem[];
  availableTranslations: Record<string, AvailableTranslation[]>;
  courseTitle?: string;
}

export function CourseContentTabs({ publishedContent, availableTranslations, courseTitle }: CourseContentTabsProps) {
  const { t } = useTranslation();

  // Group content by tab
  const tabData = useMemo(() => {
    const grouped: Record<string, PublishedContentItem[]> = {
      learn: [],
      practice: [],
      exam: [],
      media: [],
    };
    for (const item of publishedContent) {
      for (const [tab, types] of Object.entries(TAB_CONTENT_TYPES)) {
        if (types.includes(item.contentType)) {
          grouped[tab].push(item);
          break;
        }
      }
    }
    return grouped;
  }, [publishedContent]);

  // Only show tabs that have content
  const activeTabs = useMemo(() => {
    return (["learn", "practice", "exam", "media"] as const).filter(
      (tab) => tabData[tab].length > 0,
    );
  }, [tabData]);

  const [activeTab, setActiveTab] = useState<string>(activeTabs[0] ?? "learn");

  // Content types available in current tab — ordered to match TAB_CONTENT_TYPES definition
  const currentTabTypes = useMemo(() => {
    const items = tabData[activeTab] ?? [];
    const available = new Set<string>();
    for (const item of items) {
      available.add(item.contentType);
    }
    // Preserve the order defined in TAB_CONTENT_TYPES
    const definedOrder = TAB_CONTENT_TYPES[activeTab] ?? [];
    return definedOrder.filter((type) => available.has(type));
  }, [tabData, activeTab]);

  const [activeType, setActiveType] = useState<string>("");

  // Reset type when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveType("");
    setActiveVariantIndex(0);
    setViewingTranslation(null);
  };

  // Determine the effective active type
  const effectiveType = activeType || currentTabTypes[0] || "";

  // Items of the current type
  const currentItems = useMemo(() => {
    return (tabData[activeTab] ?? []).filter((i) => i.contentType === effectiveType);
  }, [tabData, activeTab, effectiveType]);

  // Multi-variant types support
  const hasMultipleVariants = currentItems.length > 1;
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setActiveVariantIndex(0);
    setViewingTranslation(null);
  };

  const currentItem = currentItems[Math.min(activeVariantIndex, currentItems.length - 1)];

  // Translation state
  const [viewingTranslation, setViewingTranslation] = useState<string | null>(null);

  // Get the content to render (original or translated)
  const renderContent = useMemo(() => {
    if (!currentItem) return null;

    if (viewingTranslation) {
      const translations = availableTranslations[currentItem.id] ?? [];
      const match = translations.find((t) => t.language === viewingTranslation);
      if (match?.content) {
        return match.content as Record<string, unknown>;
      }
    }

    return (currentItem.content ?? {}) as Record<string, unknown>;
  }, [currentItem, viewingTranslation, availableTranslations]);

  if (activeTabs.length === 0) return null;

  const tabLabelKey: Record<string, string> = {
    learn: "learn",
    practice: "practice",
    exam: "exam",
    media: "media",
  };

  return (
    <div className="space-y-6">
      {/* Tab cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {activeTabs.map((tab) => (
          <motion.button
            key={tab}
            onClick={() => handleTabChange(tab)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3, ease }}
            className={`group relative flex items-center justify-center overflow-hidden rounded-2xl px-4 py-5 transition-all duration-300 ${
              activeTab === tab
                ? "border border-[#5227FF]/20 bg-[#5227FF]/5 shadow-md dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10"
                : "border border-gray-900/10 bg-white/50 backdrop-blur-xl hover:shadow-lg dark:border-white/15 dark:bg-white/5"
            }`}
          >
            {/* Grainient hover overlay */}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)",
              }}
            />
            {/* Grain noise */}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: "128px 128px",
              }}
            />
            <span className={`relative z-10 font-display text-sm font-light sm:text-base ${
              activeTab === tab
                ? "text-[#5227FF] dark:text-[#8B6FFF]"
                : "text-gray-900 dark:text-white"
            }`}>
              {t(`courseContent.${tabLabelKey[tab]}`) || tab}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Content type selector + variant picker */}
      {currentTabTypes.length > 0 && (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="space-y-3"
        >
          {/* Desktop: glass cards centered + translate button floating right */}
          <div className="relative hidden sm:block">
            <div className="flex items-center justify-center gap-2">
              {currentTabTypes.map((type) => {
                const isActive = effectiveType === type;

                return (
                  <motion.button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease }}
                    className={`group relative flex items-center justify-center overflow-hidden rounded-2xl px-5 py-3 transition-all duration-300 ${
                      isActive
                        ? "border border-[#5227FF]/20 bg-[#5227FF]/5 shadow-sm dark:border-[#8B6FFF]/20 dark:bg-[#5227FF]/10"
                        : "border border-gray-900/10 bg-white/50 backdrop-blur-xl hover:shadow-md dark:border-white/15 dark:bg-white/5"
                    }`}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)",
                      }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                        backgroundSize: "128px 128px",
                      }}
                    />
                    <span className={`relative z-10 text-xs font-medium ${
                      isActive
                        ? "text-[#5227FF] dark:text-[#8B6FFF]"
                        : "text-gray-900/60 dark:text-white/60"
                    }`}>
                      {t(`courseContent.${CONTENT_TYPE_LABELS[type]}`) || type.replace(/_/g, " ")}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {/* Translate button — floats right, doesn't affect centering */}
            {currentItem && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <LanguageSelector
                  contentId={currentItem.id}
                  contentLanguage={currentItem.language}
                  availableTranslations={availableTranslations[currentItem.id] ?? []}
                  viewingTranslation={viewingTranslation}
                  onSelectTranslation={setViewingTranslation}
                  compact
                />
              </div>
            )}
          </div>

          {/* Mobile: OptionPicker centered + translate button */}
          <div className="relative sm:hidden">
            <OptionPicker
              options={currentTabTypes.map((type) => ({
                value: type,
                label: t(`courseContent.${CONTENT_TYPE_LABELS[type]}`) || type.replace(/_/g, " "),
              }))}
              value={effectiveType}
              onChange={(type) => {
                handleTypeChange(type);
                setViewingTranslation(null);
              }}
              size="sm"
            />
            {currentItem && (
              <div className="mt-2 flex items-center justify-center">
                <LanguageSelector
                  contentId={currentItem.id}
                  contentLanguage={currentItem.language}
                  availableTranslations={availableTranslations[currentItem.id] ?? []}
                  viewingTranslation={viewingTranslation}
                  onSelectTranslation={setViewingTranslation}
                  compact
                />
              </div>
            )}
          </div>

          {/* Variant picker (if multiple variants of selected type) */}
          {hasMultipleVariants && (
            <VariantPicker
              items={currentItems}
              activeIndex={activeVariantIndex}
              onSelect={(idx) => { setActiveVariantIndex(idx); setViewingTranslation(null); }}
            />
          )}
        </motion.div>
      )}

      {/* Content renderer */}
      <AnimatePresence mode="wait">
        {currentItem && renderContent && (
          <motion.div
            key={`${currentItem.id}-${viewingTranslation ?? "original"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            {/* Content title + language badge */}
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-display text-lg font-light text-balance text-gray-900 dark:text-white">
                  {viewingTranslation
                    ? (availableTranslations[currentItem.id]?.find((t) => t.language === viewingTranslation)?.title ?? currentItem.title)
                    : currentItem.title}
                </h3>
                <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#5227FF] dark:text-[#8B6FFF]">
                  {(viewingTranslation ?? currentItem.language).toUpperCase()}
                </span>
              </div>
              {currentItem.description && !viewingTranslation && (
                <p className="mt-1 text-sm text-gray-900/50 dark:text-white/50">
                  {currentItem.description}
                </p>
              )}
            </div>

            <ContentRenderer
              contentType={currentItem.contentType}
              content={renderContent}
              contentId={currentItem.id}
              courseId={currentItem.courseId}
              courseTitle={courseTitle}
              mediaUrl={currentItem.mediaUrl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
