import { getFollowedCourses } from "./actions";
import { BookmarksClient } from "./BookmarksClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Quick access to courses you follow.",
};

export default async function BookmarksPage() {
  const courses = await getFollowedCourses();

  return <BookmarksClient courses={courses} />;
}
