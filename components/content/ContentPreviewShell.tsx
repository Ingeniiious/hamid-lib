"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ContentRenderer } from "./ContentRenderer";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const TEACHER_IMG_BASE = "https://lib.thevibecodedcompany.com/images/teachers";

const MODEL_INFO: Record<
  string,
  { name: string; role: string; image: string }
> = {
  kimi: { name: "Kimi K2.5", role: "Creator", image: `${TEACHER_IMG_BASE}/kimi.webp` },
  chatgpt: { name: "GPT-5.4", role: "Reviewer", image: `${TEACHER_IMG_BASE}/chatgpt.webp` },
  claude: { name: "Claude Opus 4.6", role: "Enricher", image: `${TEACHER_IMG_BASE}/claude.webp` },
  gemini: { name: "Gemini 3.1 Pro", role: "Validator", image: `${TEACHER_IMG_BASE}/gemini.webp` },
  grok: { name: "Grok 4.20", role: "Fact Checker", image: `${TEACHER_IMG_BASE}/grok.webp` },
};

function titleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface GeneratedContentItem {
  id: string;
  contentType: string;
  title: string;
  content: Record<string, unknown> | null;
  richText: string | null;
  language: string;
  modelSource: string | null;
  version: number;
  isPublished: boolean;
  createdAt: string;
}

interface ContentPreviewShellProps {
  items: GeneratedContentItem[];
  onPublishToggle?: (contentId: string, isPublished: boolean) => void;
}

export function ContentPreviewShell({
  items,
  onPublishToggle,
}: ContentPreviewShellProps) {
  // Group items by contentType
  const grouped: Record<string, GeneratedContentItem[]> = {};
  for (const item of items) {
    if (!grouped[item.contentType]) grouped[item.contentType] = [];
    grouped[item.contentType].push(item);
  }

  const contentTypes = Object.keys(grouped);
  const [activeType, setActiveType] = useState(contentTypes[0] ?? "");
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  const activeItems = grouped[activeType] ?? [];
  const activeItem = activeItems[activeVariantIdx] ?? activeItems[0];

  // Reset variant when switching content type
  const handleTypeChange = useCallback(
    (type: string) => {
      setActiveType(type);
      setActiveVariantIdx(0);
    },
    [],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Generated Content Yet
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="space-y-4"
    >
      {/* Content Type Tabs */}
      {contentTypes.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {contentTypes.map((ct) => (
            <button
              key={ct}
              onClick={() => handleTypeChange(ct)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeType === ct
                  ? "bg-[#5227FF] text-white"
                  : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              {titleCase(ct)} ({grouped[ct].length})
            </button>
          ))}
        </div>
      )}

      {/* Variant Selector (model source badges) */}
      {activeItems.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {activeItems.map((item, idx) => {
            const model = item.modelSource
              ? MODEL_INFO[item.modelSource]
              : null;
            return (
              <button
                key={item.id}
                onClick={() => setActiveVariantIdx(idx)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  activeVariantIdx === idx
                    ? "bg-[#5227FF]/10 text-[#5227FF] ring-1 ring-[#5227FF]/30 dark:text-[#8B6FFF] dark:ring-[#8B6FFF]/30"
                    : "bg-gray-900/5 text-gray-900/50 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
                }`}
              >
                {model && (
                  <img
                    src={model.image}
                    alt={model.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                )}
                {model?.name ?? item.modelSource ?? `Variant ${idx + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Item Header */}
      {activeItem && (
        <motion.div
          key={activeItem.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {activeItem.title}
            </span>
            <Badge
              variant="secondary"
              className="rounded-full bg-gray-900/5 text-[10px] dark:bg-white/5"
            >
              {activeItem.language.toUpperCase()}
            </Badge>
            {activeItem.modelSource && (
              <Badge
                variant="secondary"
                className="rounded-full bg-[#5227FF]/10 text-[10px] text-[#5227FF] dark:text-[#8B6FFF]"
              >
                {MODEL_INFO[activeItem.modelSource]?.name ??
                  activeItem.modelSource}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="rounded-full bg-gray-900/5 text-[10px] dark:bg-white/5"
            >
              v{activeItem.version}
            </Badge>

            {/* Publish toggle */}
            {onPublishToggle && (
              <div className="inline-flex items-center gap-1.5">
                <Switch
                  size="sm"
                  checked={activeItem.isPublished}
                  onCheckedChange={(checked) =>
                    onPublishToggle(activeItem.id, checked)
                  }
                  className="data-[state=checked]:bg-[#5227FF]"
                />
                <span
                  className={`text-[10px] font-medium ${
                    activeItem.isPublished
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-900/40 dark:text-white/40"
                  }`}
                >
                  {activeItem.isPublished ? "Published" : "Draft"}
                </span>
              </div>
            )}
          </div>

          {/* Content Renderer */}
          {activeItem.content ? (
            <ContentRenderer
              contentType={activeItem.contentType}
              content={activeItem.content}
              contentId={activeItem.id}
              mode="interactive"
            />
          ) : (
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="text-sm text-gray-900/50 dark:text-white/50">
                No Content Data
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
