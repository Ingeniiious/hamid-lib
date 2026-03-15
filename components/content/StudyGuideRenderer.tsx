"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "@/lib/i18n";
import type { StudyGuideContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface StudyGuideRendererProps {
  content: StudyGuideContent;
}

export function StudyGuideRenderer({ content }: StudyGuideRendererProps) {
  const { t } = useTranslation();
  const sections = content.sections;

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    () => new Set(sections.map((_, i) => i)),
  );
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const allExpanded = expandedSections.size === sections.length;

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(sections.map((_, i) => i)));
    }
  };

  const scrollToSection = useCallback((idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(idx);
        },
        { threshold: 0.3, rootMargin: "-60px 0px -40% 0px" },
      );
      observer.observe(ref);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sections.length]);

  if (!sections || sections.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Sections In This Study Guide
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-3xl">
      {/* Expand/Collapse toggle */}
      <div className="mb-6 flex items-center justify-center">
        <button
          onClick={toggleAll}
          className="rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/50 transition-all hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          {allExpanded
            ? t("courseContent.collapseAll")
            : t("courseContent.expandAll")}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-0">
        {sections.map((section, idx) => {
          const isExpanded = expandedSections.has(idx);
          const padded = String(idx + 1).padStart(2, "0");

          return (
            <div key={idx}>
              <motion.div
                ref={(el) => {
                  sectionRefs.current[idx] = el;
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease, delay: idx * 0.04 }}
                style={{ scrollMarginTop: "60px" }}
                className="rounded-2xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
              >
                {/* Section header (clickable) */}
                <button
                  onClick={() => toggleSection(idx)}
                  className="flex w-full flex-col items-center justify-center px-6 py-5 text-center transition-colors hover:bg-gray-900/[0.02] dark:hover:bg-white/[0.02]"
                >
                  {/* Faded watermark number */}
                  <span className="font-display text-4xl font-light text-[#5227FF]/10 dark:text-[#8B6FFF]/10 sm:text-5xl">
                    {padded}
                  </span>
                  {/* Title */}
                  <h3 className="mt-1 font-display text-base font-light text-gray-900 dark:text-white sm:text-lg">
                    {section.title}
                  </h3>
                  {/* Collapse indicator */}
                  <span className="mt-1 text-[10px] text-gray-900/30 dark:text-white/30">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {/* Section body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 px-6 pb-6">
                        {/* Content (markdown) */}
                        {section.content && (
                          <div className="prose-study-guide text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-3 last:mb-0">{children}</p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-gray-900/90 dark:text-white/90">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="text-gray-900/80 dark:text-white/80">{children}</em>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mx-auto my-2 inline-block space-y-1 text-left">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mx-auto my-2 inline-block space-y-1 text-left">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className="flex items-start gap-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900/30 dark:bg-white/30" />
                                    <span>{children}</span>
                                  </li>
                                ),
                              }}
                            >
                              {section.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Key Points card */}
                        {section.keyPoints && section.keyPoints.length > 0 && (
                          <div className="rounded-2xl border border-[#5227FF]/10 bg-[#5227FF]/5 p-5 text-center dark:border-[#8B6FFF]/10 dark:bg-[#5227FF]/10">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#5227FF] dark:text-[#8B6FFF]">
                              {t("courseContent.keyPoints") || "Key Points"}
                            </p>
                            <ul className="mx-auto inline-block space-y-2 text-left">
                              {section.keyPoints.map((point, pi) => (
                                <li
                                  key={pi}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5227FF] dark:bg-[#8B6FFF]" />
                                  <span className="text-sm text-gray-900/80 dark:text-white/80">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <>{children}</>,
                                        strong: ({ children }) => (
                                          <strong className="font-semibold text-gray-900/90 dark:text-white/90">{children}</strong>
                                        ),
                                      }}
                                    >
                                      {point}
                                    </ReactMarkdown>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Examples */}
                        {section.examples && section.examples.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
                              {t("courseContent.examples") || "Examples"}
                            </p>
                            {section.examples.map((example, ei) => (
                              <div
                                key={ei}
                                className="rounded-2xl border border-gray-900/10 p-4 dark:border-white/10"
                              >
                                <div className="border-l-2 border-[#5227FF]/20 pl-4 dark:border-[#8B6FFF]/20">
                                  <div className="text-center text-sm text-gray-900/70 dark:text-white/70">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <>{children}</>,
                                        strong: ({ children }) => (
                                          <strong className="font-semibold text-gray-900/90 dark:text-white/90">{children}</strong>
                                        ),
                                      }}
                                    >
                                      {example}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Dashed separator between sections */}
              {idx < sections.length - 1 && (
                <div className="my-4 border-t border-dashed border-gray-900/10 dark:border-white/10" />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
