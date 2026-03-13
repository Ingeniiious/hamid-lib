"use client";

import { useTranslation, localized } from "@/lib/i18n";
import { CourseGrid } from "@/components/CourseGrid";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { ContributorCTA } from "@/components/ContributorCTA";
import { GrainientButton } from "@/components/GrainientButton";

interface Course {
  id: string;
  title: string;
  slug: string | null;
  professor: string | null;
  semester: string | null;
  programName: string | null;
}

interface FacultyCoursesContentProps {
  faculty: { id: number; name: string; slug: string; translations?: Record<string, { name?: string }> | null };
  courses: Course[];
  facultySlug: string;
  isContributor: boolean;
}

export function FacultyCoursesContent({
  faculty,
  courses,
  facultySlug,
  isContributor,
}: FacultyCoursesContentProps) {
  const { t, locale } = useTranslation();
  const facultyName = localized(locale, faculty.name, faculty.translations, "name");

  const subtitle = `${courses.length} ${
    courses.length === 1 ? t("courses.course") : t("courses.title")
  }`;

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title={facultyName} subtitle={subtitle} />
        {courses.length > 3 && (
          <div className="mt-3 flex justify-center">
            <GrainientButton href={`/dashboard/contribute?facultySlug=${facultySlug}`}>
              {isContributor ? t("contribute.uploadYourMaterials") : t("contribute.becomeContributor")}
            </GrainientButton>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
        <div className="mx-auto max-w-5xl pt-8">
          {courses.length === 0 ? (
            <ContributorCTA
              heading={t("courses.noCourses")}
              subtext={t("courses.beFirstToRequest")}
              href={`/dashboard/contribute?facultySlug=${facultySlug}`}
              imageHeight={200}
              variant="full"
              isContributor={isContributor}
            />
          ) : (
            <>
              <CourseGrid
                courses={courses}
                hrefPrefix={`/dashboard/courses/${facultySlug}`}
              />

              {/* Persistent CTA below course grid */}
              <div className="mt-12">
                <ContributorCTA
                  heading={t("courses.cantFindCourse")}
                  subtext={t("courses.helpUsGrow")}
                  href={`/dashboard/contribute?facultySlug=${facultySlug}`}
                  imageHeight={200}
                  variant="compact"
                  isContributor={isContributor}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <BackButton href="/dashboard/courses" label={t("courses.allFaculties")} floating />
    </div>
  );
}
