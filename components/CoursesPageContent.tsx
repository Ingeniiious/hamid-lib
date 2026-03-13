"use client";

import { motion } from "framer-motion";
import { useTranslation, localized } from "@/lib/i18n";
import { FacultyCard } from "@/components/FacultyCard";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { UniversitySetup } from "@/app/(main)/dashboard/courses/UniversitySetup";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface Faculty {
  id: number;
  name: string;
  slug: string;
  illustration: string | null;
  courseCount: number;
  translations?: Record<string, { name?: string }> | null;
}

interface CoursesPageContentProps {
  university: string | null;
  userFacultyId: number | null;
  faculties: Faculty[];
}

export function CoursesPageContent({
  university,
  userFacultyId,
  faculties,
}: CoursesPageContentProps) {
  const { t, locale } = useTranslation();

  if (!university) {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
          <PageHeader
            title={t("courses.title")}
            subtitle={t("courses.browseByFaculty")}
          />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24">
          <UniversitySetup />
        </div>
        <BackButton href="/dashboard" label={t("common.backToDashboard")} floating />
      </div>
    );
  }

  const pinnedFaculty = userFacultyId
    ? faculties.find((f) => f.id === userFacultyId)
    : null;
  const otherFaculties = pinnedFaculty
    ? faculties.filter((f) => f.id !== userFacultyId)
    : faculties;

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader
          title={`${t("courses.coursesOf")} ${university}`}
          subtitle={t("courses.browseByFaculty")}
        />
      </div>

      {/* Scrollable content */}
      <div
        className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        {faculties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease }}
            className="flex flex-col items-center justify-center pt-40 text-center"
          >
            <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
              {t("courses.noFacultiesYet")}
            </h2>
            <p className="mt-2 text-sm text-gray-900/50 dark:text-white/50">
              {t("courses.facultiesWillAppear")}
            </p>
          </motion.div>
        ) : (
          <div className="pt-8">
            {pinnedFaculty && (
              <div className="mb-8">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="mb-3 text-center text-sm font-medium text-gray-900/40 dark:text-white/40"
                >
                  {t("courses.yourFaculty")}
                </motion.p>
                <div className="mx-auto max-w-xs">
                  <FacultyCard
                    name={localized(locale, pinnedFaculty.name, pinnedFaculty.translations, "name")}
                    slug={pinnedFaculty.slug}
                    illustration={pinnedFaculty.illustration}
                    courseCount={pinnedFaculty.courseCount}
                    index={0}
                    highlighted
                  />
                </div>
              </div>
            )}
            {otherFaculties.length > 0 && (
              <>
                {pinnedFaculty && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease, delay: 0.1 }}
                    className="mb-3 text-center text-sm font-medium text-gray-900/40 dark:text-white/40"
                  >
                    {t("courses.allFaculties")}
                  </motion.p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherFaculties.map((f, index) => (
                    <FacultyCard
                      key={f.id}
                      name={localized(locale, f.name, f.translations, "name")}
                      slug={f.slug}
                      illustration={f.illustration}
                      courseCount={f.courseCount}
                      index={pinnedFaculty ? index + 1 : index}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <BackButton href="/dashboard" label={t("common.backToDashboard")} floating />
    </div>
  );
}
