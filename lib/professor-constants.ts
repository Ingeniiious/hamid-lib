export const REVIEW_TAGS = [
  "Clear Lectures",
  "Tough Grader",
  "Helpful Office Hours",
  "Heavy Workload",
  "Inspiring",
  "Easy Grader",
  "Caring",
  "Group Projects",
  "Lots Of Homework",
  "Test Heavy",
  "Get Ready To Read",
  "Lecture Heavy",
  "Accessible Outside Class",
  "Participation Matters",
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];
