"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { GrainientButton } from "@/components/GrainientButton";
import { FadeImage, preloadImages } from "@/components/FadeImage";
import { useTranslation } from "@/lib/i18n";
import SubscribeButton from "@/components/SubscribeButton";
import ShareButton from "@/components/ShareButton";
import { CourseContentTabs } from "@/components/CourseContentTabs";
import type { PublishedContentItem, AvailableTranslation } from "@/components/CourseContentTabs";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const CDN = "https://lib.thevibecodedcompany.com";

export interface ContributionGroup {
  key: string;
  title: string;
  contentIds: string[];
}

interface CourseDetailProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    professor: string | null;
    semester: string | null;
    major: string | null;
  };
  isContributor?: boolean;
  facultySlug?: string;
  initialSubscribed?: boolean;
  publishedContent?: PublishedContentItem[];
  availableTranslations?: Record<string, AvailableTranslation[]>;
  contributionGroups?: ContributionGroup[];
}

export function CourseDetail({ course, isContributor, facultySlug, initialSubscribed = false, publishedContent = [], availableTranslations = {}, contributionGroups = [] }: CourseDetailProps) {
  const { t } = useTranslation();
  // Preload on mount so the image is ready before user scrolls down
  useEffect(() => {
    preloadImages([`${CDN}/images/expert.webp`]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
    >
      <div className="mx-auto flex flex-wrap items-center justify-center gap-4 text-sm text-gray-900/50 dark:text-white/50">
        {course.professor && <span>{course.professor}</span>}
        {course.professor && course.semester && (
          <Separator orientation="vertical" className="h-4" />
        )}
        {course.semester && <span>{course.semester}</span>}
      </div>

      {/* Subscribe + Share + Contribute buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <SubscribeButton
          entityType="course"
          entityId={course.id}
          initialSubscribed={initialSubscribed}
        />
        <GrainientButton
          href={`/dashboard/contribute?courseId=${course.id}${facultySlug ? `&facultySlug=${facultySlug}` : ""}`}
        >
          {isContributor
            ? t("contribute.contributeToCourse")
            : t("contribute.becomeContributor")}
        </GrainientButton>
        <ShareButton
          title={course.title}
          text={course.description || course.title}
        />
      </div>

      <Separator className="mx-auto mt-8 max-w-md bg-gray-900/10 dark:bg-white/10" />

      {publishedContent.length > 0 ? (
        <>
          {/* Content tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-8"
          >
            <CourseContentTabs
              publishedContent={publishedContent}
              availableTranslations={availableTranslations}
              courseTitle={course.title}
              contributionGroups={contributionGroups}
            />
          </motion.div>

        </>
      ) : (
        <>
          {/* Empty state tabs */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["learn", "practice", "exam", "media"].map((tab, i) => (
              <motion.div
                key={tab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease, delay: 0.2 + i * 0.1 }}
              >
                <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/5">
                  <h3 className="font-display text-sm font-light text-gray-900 dark:text-white">
                    {t(`courseContent.${tab}`) || tab}
                  </h3>
                  <p className="mt-1 text-xs text-gray-900/40 dark:text-white/40">
                    {t("courseContent.noContentYet")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Illustrated empty state CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.6 }}
            className="mx-auto mt-12 flex max-w-md flex-col items-center text-center"
          >
            <FadeImage
              src={`${CDN}/images/expert.webp`}
              className="h-[200px] w-auto object-contain"
            />
            <h3 className="mt-6 font-display text-xl font-light text-gray-900 dark:text-white">
              {isContributor
                ? t("contribute.shareYourMaterials")
                : t("contribute.beFirstToContribute")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-900/50 dark:text-white/50">
              {isContributor
                ? t("contribute.uploadNotesHelp")
                : t("contribute.courseNeedsHelp")}
            </p>
            <div className="mt-6">
              <GrainientButton
                href={`/dashboard/contribute?courseId=${course.id}${facultySlug ? `&facultySlug=${facultySlug}` : ""}`}
              >
                {isContributor
                  ? t("contribute.contributeToCourse")
                  : t("contribute.becomeContributor")}
              </GrainientButton>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
