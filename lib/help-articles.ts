/* ─── Help article data — shared between listing page, detail page, and sitemap ─── */

export interface HelpArticle {
  slug: string;
  titleKey: string;
  descKey: string;
  bodyKey: string;
  category: string;
}

export interface HelpCategory {
  titleKey: string;
  articles: HelpArticle[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    titleKey: "helpArticles.gettingStarted",
    articles: [
      { slug: "create-account", titleKey: "helpArticles.createAccount", descKey: "helpArticles.createAccountDesc", bodyKey: "helpArticles.createAccountBody", category: "helpArticles.gettingStarted" },
      { slug: "navigate-dashboard", titleKey: "helpArticles.navigateDashboard", descKey: "helpArticles.navigateDashboardDesc", bodyKey: "helpArticles.navigateDashboardBody", category: "helpArticles.gettingStarted" },
      { slug: "choose-language", titleKey: "helpArticles.chooseLanguage", descKey: "helpArticles.chooseLanguageDesc", bodyKey: "helpArticles.chooseLanguageBody", category: "helpArticles.gettingStarted" },
      { slug: "dark-mode", titleKey: "helpArticles.darkMode", descKey: "helpArticles.darkModeDesc", bodyKey: "helpArticles.darkModeBody", category: "helpArticles.gettingStarted" },
    ],
  },
  {
    titleKey: "helpArticles.coursesStudying",
    articles: [
      { slug: "browse-courses", titleKey: "helpArticles.browseCourses", descKey: "helpArticles.browseCoursesDesc", bodyKey: "helpArticles.browseCoursesBody", category: "helpArticles.coursesStudying" },
      { slug: "course-content", titleKey: "helpArticles.courseContent", descKey: "helpArticles.courseContentDesc", bodyKey: "helpArticles.courseContentBody", category: "helpArticles.coursesStudying" },
      { slug: "study-materials", titleKey: "helpArticles.studyMaterials", descKey: "helpArticles.studyMaterialsDesc", bodyKey: "helpArticles.studyMaterialsBody", category: "helpArticles.coursesStudying" },
      { slug: "track-progress", titleKey: "helpArticles.trackProgress", descKey: "helpArticles.trackProgressDesc", bodyKey: "helpArticles.trackProgressBody", category: "helpArticles.coursesStudying" },
    ],
  },
  {
    titleKey: "helpArticles.examsTitle",
    articles: [
      { slug: "mock-exams", titleKey: "helpArticles.mockExams", descKey: "helpArticles.mockExamsDesc", bodyKey: "helpArticles.mockExamsBody", category: "helpArticles.examsTitle" },
      { slug: "question-types", titleKey: "helpArticles.questionTypes", descKey: "helpArticles.questionTypesDesc", bodyKey: "helpArticles.questionTypesBody", category: "helpArticles.examsTitle" },
      { slug: "essay-grading", titleKey: "helpArticles.essayGrading", descKey: "helpArticles.essayGradingDesc", bodyKey: "helpArticles.essayGradingBody", category: "helpArticles.examsTitle" },
      { slug: "exam-results", titleKey: "helpArticles.examResults", descKey: "helpArticles.examResultsDesc", bodyKey: "helpArticles.examResultsBody", category: "helpArticles.examsTitle" },
    ],
  },
  {
    titleKey: "helpArticles.contributionsTitle",
    articles: [
      { slug: "how-to-contribute", titleKey: "helpArticles.howToContribute", descKey: "helpArticles.howToContributeDesc", bodyKey: "helpArticles.howToContributeBody", category: "helpArticles.contributionsTitle" },
      { slug: "file-formats", titleKey: "helpArticles.fileFormats", descKey: "helpArticles.fileFormatsDesc", bodyKey: "helpArticles.fileFormatsBody", category: "helpArticles.contributionsTitle" },
      { slug: "moderation-process", titleKey: "helpArticles.moderationProcess", descKey: "helpArticles.moderationProcessDesc", bodyKey: "helpArticles.moderationProcessBody", category: "helpArticles.contributionsTitle" },
      { slug: "core-contributor", titleKey: "helpArticles.coreContributor", descKey: "helpArticles.coreContributorDesc", bodyKey: "helpArticles.coreContributorBody", category: "helpArticles.contributionsTitle" },
    ],
  },
  {
    titleKey: "helpArticles.aiTeachersTitle",
    articles: [
      { slug: "meet-the-teachers", titleKey: "helpArticles.meetTeachers", descKey: "helpArticles.meetTeachersDesc", bodyKey: "helpArticles.meetTeachersBody", category: "helpArticles.aiTeachersTitle" },
      { slug: "how-content-is-created", titleKey: "helpArticles.contentCreation", descKey: "helpArticles.contentCreationDesc", bodyKey: "helpArticles.contentCreationBody", category: "helpArticles.aiTeachersTitle" },
      { slug: "content-types", titleKey: "helpArticles.contentTypes", descKey: "helpArticles.contentTypesDesc", bodyKey: "helpArticles.contentTypesBody", category: "helpArticles.aiTeachersTitle" },
      { slug: "challenge-content", titleKey: "helpArticles.challengeContent", descKey: "helpArticles.challengeContentDesc", bodyKey: "helpArticles.challengeContentBody", category: "helpArticles.aiTeachersTitle" },
    ],
  },
  {
    titleKey: "helpArticles.professorRatingsTitle",
    articles: [
      { slug: "find-a-professor", titleKey: "helpArticles.findProfessor", descKey: "helpArticles.findProfessorDesc", bodyKey: "helpArticles.findProfessorBody", category: "helpArticles.professorRatingsTitle" },
      { slug: "write-a-review", titleKey: "helpArticles.writeReview", descKey: "helpArticles.writeReviewDesc", bodyKey: "helpArticles.writeReviewBody", category: "helpArticles.professorRatingsTitle" },
      { slug: "verified-reviews", titleKey: "helpArticles.verifiedReviews", descKey: "helpArticles.verifiedReviewsDesc", bodyKey: "helpArticles.verifiedReviewsBody", category: "helpArticles.professorRatingsTitle" },
      { slug: "choose-your-professor", titleKey: "helpArticles.chooseProfessor", descKey: "helpArticles.chooseProfessorDesc", bodyKey: "helpArticles.chooseProfessorBody", category: "helpArticles.professorRatingsTitle" },
    ],
  },
];

/* Flat list + slug lookup */
export const ALL_ARTICLES = HELP_CATEGORIES.flatMap((c) => c.articles);

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}
