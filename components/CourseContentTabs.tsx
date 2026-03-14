"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContentRenderer } from "@/components/content/ContentRenderer";
import { LanguageSelector } from "@/components/content/LanguageSelector";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// Tab → content type mapping
const TAB_CONTENT_TYPES: Record<string, string[]> = {
  learning: ["study_guide", "slide_deck", "report", "interactive_section"],
  studying: ["flashcards", "mind_map", "data_table", "infographic_data", "podcast_script", "video_script"],
  exam: ["quiz", "mock_exam"],
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
}

export function CourseContentTabs({ publishedContent, availableTranslations }: CourseContentTabsProps) {
  const { t } = useTranslation();

  // Group content by tab
  const tabData = useMemo(() => {
    const grouped: Record<string, PublishedContentItem[]> = {
      learning: [],
      studying: [],
      exam: [],
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
    return (["learning", "studying", "exam"] as const).filter(
      (tab) => tabData[tab].length > 0,
    );
  }, [tabData]);

  const [activeTab, setActiveTab] = useState<string>(activeTabs[0] ?? "learning");

  // Content types available in current tab
  const currentTabTypes = useMemo(() => {
    const items = tabData[activeTab] ?? [];
    const types: string[] = [];
    for (const item of items) {
      if (!types.includes(item.contentType)) {
        types.push(item.contentType);
      }
    }
    return types;
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
    learning: "learning",
    studying: "studying",
    exam: "exam",
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-2">
        {activeTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-[#5227FF] text-white"
                : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
            }`}
          >
            {t(`courseContent.${tabLabelKey[tab]}`) || tab}
          </button>
        ))}
      </div>

      {/* Content type selector (if multiple types in tab) */}
      {currentTabTypes.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          {currentTabTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                effectiveType === type
                  ? "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
                  : "bg-gray-900/5 text-gray-900/50 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
              }`}
            >
              {t(`courseContent.${CONTENT_TYPE_LABELS[type]}`) || type.replace(/_/g, " ")}
            </button>
          ))}
        </motion.div>
      )}

      {/* Variant selector (if multiple items of same type) */}
      {hasMultipleVariants && (
        <div className="flex items-center justify-center gap-2">
          {currentItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => { setActiveVariantIndex(idx); setViewingTranslation(null); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeVariantIndex === idx
                  ? "bg-[#5227FF]/10 text-[#5227FF] dark:bg-[#5227FF]/20 dark:text-[#8B6FFF]"
                  : "bg-gray-900/5 text-gray-900/50 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
              }`}
            >
              {t("courseContent.variant")} {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Language selector + Original/Translated toggle */}
      {currentItem && (
        <LanguageSelector
          contentId={currentItem.id}
          contentLanguage={currentItem.language}
          availableTranslations={availableTranslations[currentItem.id] ?? []}
          viewingTranslation={viewingTranslation}
          onSelectTranslation={setViewingTranslation}
        />
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
            {/* Content title */}
            <div className="mb-4 text-center">
              <h3 className="font-display text-lg font-light text-gray-900 dark:text-white">
                {viewingTranslation
                  ? (availableTranslations[currentItem.id]?.find((t) => t.language === viewingTranslation)?.title ?? currentItem.title)
                  : currentItem.title}
              </h3>
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
              mediaUrl={currentItem.mediaUrl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
