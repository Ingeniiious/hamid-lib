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
      { slug: "university-setup", titleKey: "helpArticles.universitySetup", descKey: "helpArticles.universitySetupDesc", bodyKey: "helpArticles.universitySetupBody", category: "helpArticles.gettingStarted" },
      { slug: "personalize", titleKey: "helpArticles.personalize", descKey: "helpArticles.personalizeDesc", bodyKey: "helpArticles.personalizeBody", category: "helpArticles.gettingStarted" },
    ],
  },
  {
    titleKey: "helpArticles.yourDashboard",
    articles: [
      { slug: "navigate-dashboard", titleKey: "helpArticles.navigateDashboard", descKey: "helpArticles.navigateDashboardDesc", bodyKey: "helpArticles.navigateDashboardBody", category: "helpArticles.yourDashboard" },
      { slug: "my-space", titleKey: "helpArticles.mySpace", descKey: "helpArticles.mySpaceDesc", bodyKey: "helpArticles.mySpaceBody", category: "helpArticles.yourDashboard" },
      { slug: "support", titleKey: "helpArticles.support", descKey: "helpArticles.supportDesc", bodyKey: "helpArticles.supportBody", category: "helpArticles.yourDashboard" },
    ],
  },
  {
    titleKey: "helpArticles.sharingPortalTitle",
    articles: [
      { slug: "presentations", titleKey: "helpArticles.presentations", descKey: "helpArticles.presentationsDesc", bodyKey: "helpArticles.presentationsBody", category: "helpArticles.sharingPortalTitle" },
      { slug: "portal", titleKey: "helpArticles.portal", descKey: "helpArticles.portalDesc", bodyKey: "helpArticles.portalBody", category: "helpArticles.sharingPortalTitle" },
    ],
  },
  {
    titleKey: "helpArticles.coursesStudying",
    articles: [
      { slug: "browse-courses", titleKey: "helpArticles.browseCourses", descKey: "helpArticles.browseCoursesDesc", bodyKey: "helpArticles.browseCoursesBody", category: "helpArticles.coursesStudying" },
      { slug: "course-content", titleKey: "helpArticles.courseContent", descKey: "helpArticles.courseContentDesc", bodyKey: "helpArticles.courseContentBody", category: "helpArticles.coursesStudying" },
    ],
  },
  {
    titleKey: "helpArticles.examsTitle",
    articles: [
      { slug: "mock-exams", titleKey: "helpArticles.mockExams", descKey: "helpArticles.mockExamsDesc", bodyKey: "helpArticles.mockExamsBody", category: "helpArticles.examsTitle" },
      { slug: "grading-and-results", titleKey: "helpArticles.gradingResults", descKey: "helpArticles.gradingResultsDesc", bodyKey: "helpArticles.gradingResultsBody", category: "helpArticles.examsTitle" },
    ],
  },
  {
    titleKey: "helpArticles.contributionsTitle",
    articles: [
      { slug: "how-to-contribute", titleKey: "helpArticles.howToContribute", descKey: "helpArticles.howToContributeDesc", bodyKey: "helpArticles.howToContributeBody", category: "helpArticles.contributionsTitle" },
      { slug: "moderation-process", titleKey: "helpArticles.moderationProcess", descKey: "helpArticles.moderationProcessDesc", bodyKey: "helpArticles.moderationProcessBody", category: "helpArticles.contributionsTitle" },
      { slug: "core-contributor", titleKey: "helpArticles.coreContributor", descKey: "helpArticles.coreContributorDesc", bodyKey: "helpArticles.coreContributorBody", category: "helpArticles.contributionsTitle" },
    ],
  },
  {
    titleKey: "helpArticles.aiTeachersTitle",
    articles: [
      { slug: "meet-the-teachers", titleKey: "helpArticles.meetTeachers", descKey: "helpArticles.meetTeachersDesc", bodyKey: "helpArticles.meetTeachersBody", category: "helpArticles.aiTeachersTitle" },
      { slug: "how-content-is-created", titleKey: "helpArticles.contentCreation", descKey: "helpArticles.contentCreationDesc", bodyKey: "helpArticles.contentCreationBody", category: "helpArticles.aiTeachersTitle" },
      { slug: "challenge-content", titleKey: "helpArticles.challengeContent", descKey: "helpArticles.challengeContentDesc", bodyKey: "helpArticles.challengeContentBody", category: "helpArticles.aiTeachersTitle" },
    ],
  },
  {
    titleKey: "helpArticles.professorRatingsTitle",
    articles: [
      { slug: "find-a-professor", titleKey: "helpArticles.findProfessor", descKey: "helpArticles.findProfessorDesc", bodyKey: "helpArticles.findProfessorBody", category: "helpArticles.professorRatingsTitle" },
      { slug: "write-a-review", titleKey: "helpArticles.writeReview", descKey: "helpArticles.writeReviewDesc", bodyKey: "helpArticles.writeReviewBody", category: "helpArticles.professorRatingsTitle" },
    ],
  },
];

/* Flat list + slug lookup */
export const ALL_ARTICLES = HELP_CATEGORIES.flatMap((c) => c.articles);

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}
