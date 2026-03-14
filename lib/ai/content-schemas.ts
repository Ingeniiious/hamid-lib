// ---------------------------------------------------------------------------
// AI Council — Zod schemas for generated content validation
//
// Validates the JSON output from AI models BEFORE saving to the database.
// Each content type has a schema that matches the TypeScript interfaces
// in types.ts. Validation is lenient (allows extra fields) but ensures
// the required structure is present.
// ---------------------------------------------------------------------------

import { z } from "zod";
import type { ContentType } from "./types";

// ---------------------------------------------------------------------------
// Per-content-type schemas
// ---------------------------------------------------------------------------

const flashcardsSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
        tags: z.array(z.string()).optional(),
      })
    )
    .min(1, "Flashcards must have at least 1 card"),
});

const quizSchema = z.object({
  suggestedTimeMinutes: z.number().optional(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        type: z.string(),
        options: z.array(z.string()),
        correctIndex: z.number(),
        explanation: z.string(),
      })
    )
    .min(1, "Quiz must have at least 1 question"),
});

const studyGuideSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
        keyPoints: z.array(z.string()).optional().default([]),
        examples: z.array(z.string()).optional().default([]),
      })
    )
    .min(1, "Study guide must have at least 1 section"),
});

const mockExamSchema = z.object({
  title: z.string(),
  totalPoints: z.number(),
  suggestedTimeMinutes: z.number(),
  instructions: z.string(),
  sections: z
    .array(
      z.object({
        title: z.string(),
        points: z.number(),
        questions: z
          .array(
            z.object({
              question: z.string(),
              type: z.string(),
              grading: z.enum(["auto", "ai"]),
              points: z.number(),
              explanation: z.string(),
              options: z.array(z.string()).optional(),
              correctIndex: z.number().optional(),
              matchPairs: z
                .array(z.object({ left: z.string(), right: z.string() }))
                .optional(),
              correctMatchOrder: z.array(z.number()).optional(),
              rubric: z.string().optional(),
              sampleAnswer: z.string().optional(),
            })
          )
          .min(1),
      })
    )
    .min(1, "Mock exam must have at least 1 section"),
});

const podcastScriptSchema = z.object({
  segments: z
    .array(
      z.object({
        timestamp: z.string(),
        speaker: z.string(),
        text: z.string(),
      })
    )
    .min(1, "Podcast script must have at least 1 segment"),
  totalDuration: z.string().optional(),
});

const videoScriptSchema = z.object({
  scenes: z
    .array(
      z.object({
        title: z.string(),
        narration: z.string(),
        visualDescription: z.string(),
        duration: z.string(),
      })
    )
    .min(1, "Video script must have at least 1 scene"),
});

const mindMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        data: z.object({ label: z.string() }),
        position: z.object({ x: z.number(), y: z.number() }),
      })
    )
    .min(1, "Mind map must have at least 1 node"),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
});

const infographicSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string(),
        data: z.string(),
        chartType: z.string().optional(),
      })
    )
    .min(1, "Infographic must have at least 1 section"),
});

const slideSchema = z.object({
  slides: z
    .array(
      z.object({
        title: z.string(),
        bullets: z.array(z.string()),
        notes: z.string().optional(),
        layout: z.string().optional(),
      })
    )
    .min(1, "Slide deck must have at least 1 slide"),
});

const dataTableSchema = z.object({
  headers: z.array(z.string()).min(1, "Data table must have at least 1 header"),
  rows: z.array(z.array(z.string())).min(1, "Data table must have at least 1 row"),
  footnotes: z.array(z.string()).optional(),
});

const reportSchema = z.object({
  title: z.string(),
  abstract: z.string(),
  sections: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .min(1, "Report must have at least 1 section"),
  references: z.array(z.string()).optional().default([]),
});

const interactiveSectionSchema = z.object({
  blocks: z
    .array(
      z.object({
        type: z.string(),
        content: z.string(),
        interaction: z.string().optional(),
      })
    )
    .min(1, "Interactive section must have at least 1 block"),
});

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------

const CONTENT_SCHEMAS: Record<ContentType, z.ZodTypeAny> = {
  flashcards: flashcardsSchema,
  quiz: quizSchema,
  study_guide: studyGuideSchema,
  mock_exam: mockExamSchema,
  podcast_script: podcastScriptSchema,
  video_script: videoScriptSchema,
  mind_map: mindMapSchema,
  infographic_data: infographicSchema,
  slide_deck: slideSchema,
  data_table: dataTableSchema,
  report: reportSchema,
  interactive_section: interactiveSectionSchema,
};

// ---------------------------------------------------------------------------
// Validation function
// ---------------------------------------------------------------------------

/**
 * Recursively convert null values to undefined.
 * AI models (especially Grok) return null for optional fields instead of
 * omitting them. Zod's .optional() accepts undefined but rejects null.
 */
function stripNulls(obj: unknown): unknown {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = stripNulls(value);
    }
    return result;
  }
  return obj;
}

/**
 * Validate generated content against the expected schema for its content type.
 * Uses passthrough() so extra fields from AI models are kept (not stripped).
 *
 * Returns { success: true, data } on valid content,
 * or { success: false, errors } with human-readable error messages.
 */
export function validateGeneratedContent(
  contentType: ContentType,
  content: unknown
): { success: true; data: Record<string, unknown> } | { success: false; errors: string[] } {
  const schema = CONTENT_SCHEMAS[contentType];
  if (!schema) {
    return { success: false, errors: [`Unknown content type: ${contentType}`] };
  }

  // Strip null → undefined before validation (AI models return null for missing fields)
  const cleaned = stripNulls(content);

  // Use passthrough to keep extra fields the model may have added
  const result = (schema as z.ZodObject<z.ZodRawShape>).passthrough().safeParse(cleaned);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );

  return { success: false, errors };
}
