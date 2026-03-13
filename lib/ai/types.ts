// ---------------------------------------------------------------------------
// AI Council -- shared type definitions
// ---------------------------------------------------------------------------

export type ModelSlug = "kimi" | "chatgpt" | "claude" | "gemini" | "grok";
export type ModelRole = "creator" | "reviewer" | "enricher" | "validator" | "fact_checker" | "generator";

export type PipelineStatus =
  | "pending"
  | "extracting"
  | "reviewing"
  | "enriching"
  | "validating"
  | "fact_checking"
  | "publishing"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type StepVerdict = "approved" | "needs_changes" | "rejected";

export type ContentType =
  | "study_guide"
  | "flashcards"
  | "quiz"
  | "mock_exam"
  | "podcast_script"
  | "video_script"
  | "mind_map"
  | "infographic_data"
  | "slide_deck"
  | "data_table"
  | "report"
  | "interactive_section";

// ---------------------------------------------------------------------------
// Chat completion primitives
// ---------------------------------------------------------------------------

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  model: ModelSlug;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
}

export interface AICompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string; // actual model ID used by the provider
  finishReason: string;
}

// ---------------------------------------------------------------------------
// Provider / model configuration (mirrors ai_model_config DB table)
// ---------------------------------------------------------------------------

export interface ModelConfig {
  id: number;
  name: string;
  slug: ModelSlug;
  provider: string;
  modelId: string;
  role: ModelRole;
  pipelineOrder: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Pipeline step result -- returned by each provider call
// ---------------------------------------------------------------------------

export interface StepResult {
  content: string; // raw text output
  parsed: Record<string, unknown> | null; // parsed JSON if responseFormat was "json"
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  finishReason: string;
}

// ---------------------------------------------------------------------------
// Content type schemas -- shape of generated_content.content JSONB per type
// ---------------------------------------------------------------------------

export interface FlashcardContent {
  cards: { front: string; back: string; tags?: string[] }[];
}

export interface QuizContent {
  suggestedTimeMinutes: number;
  questions: {
    question: string;
    type: "multiple_choice" | "true_false";
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface MindMapContent {
  nodes: {
    id: string;
    data: { label: string };
    position: { x: number; y: number };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
}

export interface SlideContent {
  slides: {
    title: string;
    bullets: string[];
    notes?: string;
    layout?: string;
  }[];
}

export interface DataTableContent {
  headers: string[];
  rows: string[][];
  footnotes?: string[];
}

export interface PodcastScriptContent {
  segments: {
    timestamp: string;
    speaker: string;
    text: string;
  }[];
  totalDuration?: string;
}

export interface InfographicContent {
  sections: {
    title: string;
    data: string;
    chartType?: string;
  }[];
}

export interface StudyGuideContent {
  sections: {
    title: string;
    content: string;
    keyPoints: string[];
    examples: string[];
  }[];
}

export interface VideoScriptContent {
  scenes: {
    title: string;
    narration: string;
    visualDescription: string;
    duration: string;
  }[];
}

export interface ReportContent {
  title: string;
  abstract: string;
  sections: { title: string; content: string }[];
  references: string[];
}

export interface MockExamContent {
  title: string;
  totalPoints: number;
  suggestedTimeMinutes: number;
  instructions: string;
  sections: {
    title: string;
    points: number;
    questions: {
      question: string;
      type: "multiple_choice" | "true_false" | "short_answer" | "fill_in_blank" | "matching" | "essay" | "calculation";
      /** "auto" = code-gradable (MC, T/F, matching), "ai" = needs AI grading (essay, calculation, short answer, fill-in-blank) */
      grading: "auto" | "ai";
      points: number;
      options?: string[];
      correctIndex?: number;
      matchPairs?: { left: string; right: string }[];
      correctMatchOrder?: number[];
      rubric?: string;
      sampleAnswer?: string;
      explanation: string;
    }[];
  }[];
}

export interface InteractiveSectionContent {
  blocks: {
    type: "text" | "question" | "reveal" | "diagram" | "code" | "callout";
    content: string;
    interaction?: "click_to_reveal" | "fill_in_blank" | "drag_drop" | "toggle";
  }[];
}
