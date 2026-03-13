"use client";

import { StudyGuideRenderer } from "./StudyGuideRenderer";
import { FlashcardRenderer } from "./FlashcardRenderer";
import { QuizRenderer } from "./QuizRenderer";
import { MockExamRenderer } from "./MockExamRenderer";
import type {
  StudyGuideContent,
  FlashcardContent,
  QuizContent,
  MockExamContent,
} from "@/lib/ai/types";

export interface ContentRendererProps {
  contentType: string;
  content: Record<string, unknown>;
  contentId?: string;
  mode?: "preview" | "interactive";
}

export function ContentRenderer({
  contentType,
  content,
  contentId,
  mode = "interactive",
}: ContentRendererProps) {
  switch (contentType) {
    case "study_guide":
      return (
        <StudyGuideRenderer content={content as unknown as StudyGuideContent} />
      );

    case "flashcards":
      return (
        <FlashcardRenderer content={content as unknown as FlashcardContent} />
      );

    case "quiz":
      return (
        <QuizRenderer
          content={content as unknown as QuizContent}
          mode={mode}
        />
      );

    case "mock_exam":
      return (
        <MockExamRenderer
          content={content as unknown as MockExamContent}
          contentId={contentId}
          mode={mode}
        />
      );

    default:
      return (
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
              Raw JSON — {contentType.replace(/_/g, " ")}
            </p>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-900/[0.03] p-4 text-[11px] leading-relaxed text-gray-900/80 dark:bg-white/[0.03] dark:text-white/80">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
}
