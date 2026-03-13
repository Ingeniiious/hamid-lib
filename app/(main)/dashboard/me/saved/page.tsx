import { getUserBookmarks } from "@/lib/bookmarks";
import SavedItemsClient from "./SavedItemsClient";

export default async function SavedItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const { bookmarks, total } = await getUserBookmarks(page, 12);

  return (
    <SavedItemsClient
      bookmarks={bookmarks}
      total={total}
      page={page}
      limit={12}
    />
  );
}
