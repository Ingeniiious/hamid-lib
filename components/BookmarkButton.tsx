"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toggleBookmark } from "@/lib/bookmarks";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export default function BookmarkButton({
  contentId,
  initialBookmarked = false,
}: {
  contentId: string;
  initialBookmarked?: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleBookmark(contentId);
      if ("bookmarked" in result && typeof result.bookmarked === "boolean") {
        setBookmarked(result.bookmarked);
      }
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      whileTap={{ scale: 0.85 }}
      transition={{ ease: EASE, duration: 0.2 }}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 256 256"
        animate={{ scale: bookmarked ? [1, 1.3, 1] : 1 }}
        transition={{ ease: EASE, duration: 0.3 }}
      >
        {bookmarked ? (
          // Filled bookmark (Phosphor Duotone BookmarkSimple fill)
          <path
            d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"
            fill="#5227FF"
          />
        ) : (
          // Outline bookmark
          <path
            d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"
            fill="currentColor"
            className="text-gray-400 dark:text-gray-500"
          />
        )}
      </motion.svg>
    </motion.button>
  );
}
