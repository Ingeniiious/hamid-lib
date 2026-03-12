// ---------------------------------------------------------------------------
// AI Council -- prompt templates for the 5-role pipeline
// ---------------------------------------------------------------------------

import type { ContentType, ModelRole } from "./types";

// ---------------------------------------------------------------------------
// Content type JSON schemas (human-readable descriptions for prompts)
// ---------------------------------------------------------------------------

const CONTENT_TYPE_SCHEMAS: Record<ContentType, string> = {
  flashcards: `{
  "cards": [
    {
      "front": "Question or term (string)",
      "back": "Answer or definition (string)",
      "tags": ["topic tag (string)", ...]
    }
  ]
}
Aim for 15-30 cards. Each card should test a single concept. Tags help categorize cards by topic.`,

  quiz: `{
  "questions": [
    {
      "question": "The question text (string)",
      "type": "multiple_choice" | "true_false" | "short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": "The correct answer — option text for multiple_choice, true/false for true_false, expected answer for short_answer (string | number)",
      "explanation": "Why this answer is correct (string)"
    }
  ]
}
Generate 10-20 questions. Mix question types. Ensure distractors are plausible but clearly wrong. Every question must have an explanation.`,

  study_guide: `{
  "sections": [
    {
      "title": "Section heading (string)",
      "content": "Main explanatory text (string)",
      "keyPoints": ["Key takeaway (string)", ...],
      "examples": ["Illustrative example (string)", ...]
    }
  ]
}
Organize logically from foundational to advanced. Each section should be self-contained but build on previous ones. Include 3-5 key points per section.`,

  mock_exam: `{
  "questions": [
    {
      "question": "The question text (string)",
      "type": "multiple_choice" | "true_false" | "short_answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": "The correct answer (string | number)",
      "explanation": "Why this answer is correct (string)"
    }
  ]
}
Generate 30-50 questions. Simulate a real exam: progress from easy to hard, cover all major topics proportionally, include a mix of recall, comprehension, and application questions.`,

  mind_map: `{
  "nodes": [
    {
      "id": "unique-id (string)",
      "data": { "label": "Node label text (string)" },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "unique-edge-id (string)",
      "source": "source-node-id (string)",
      "target": "target-node-id (string)",
      "label": "Optional relationship label (string)"
    }
  ]
}
Create a hierarchical mind map. The root node should be the central topic. Branch into 3-7 main subtopics, each with 2-5 leaf nodes. Position nodes in a radial layout from center.`,

  slide_deck: `{
  "slides": [
    {
      "title": "Slide title (string)",
      "bullets": ["Bullet point (string)", ...],
      "notes": "Optional speaker notes (string)",
      "layout": "Optional layout hint: title_only | bullets | two_column | image_placeholder (string)"
    }
  ]
}
Generate 10-20 slides. Start with a title slide, end with a summary/Q&A slide. Keep bullets concise (max 6 per slide). Include speaker notes for context.`,

  podcast_script: `{
  "segments": [
    {
      "timestamp": "MM:SS format (string)",
      "speaker": "Speaker name or role, e.g. Host, Expert, Student (string)",
      "text": "What the speaker says (string)"
    }
  ],
  "totalDuration": "Estimated total duration, e.g. 15:00 (string)"
}
Structure as a conversational dialogue. Include an intro, main discussion with 3-5 key segments, and a closing summary. Aim for 10-20 minutes of content.`,

  video_script: `{
  "scenes": [
    {
      "title": "Scene title (string)",
      "narration": "Voiceover or spoken text (string)",
      "visualDescription": "What should appear on screen (string)",
      "duration": "Estimated duration, e.g. 30s, 1m (string)"
    }
  ]
}
Structure as a visual learning experience. Include an intro hook, main content in logical scenes, and a recap. Describe visuals concretely (diagrams, animations, text overlays).`,

  data_table: `{
  "headers": ["Column header (string)", ...],
  "rows": [["Cell value (string)", ...], ...],
  "footnotes": ["Explanatory footnote (string)", ...]
}
Organize data clearly with descriptive headers. Sort rows logically. Include footnotes for any abbreviations, units, or caveats.`,

  infographic_data: `{
  "sections": [
    {
      "title": "Section title (string)",
      "data": "Key statistic, fact, or data point (string)",
      "chartType": "Optional visualization hint: bar | pie | timeline | comparison | stat (string)"
    }
  ]
}
Structure for visual consumption. Lead with the most impactful data. Each section should convey one clear insight. Suggest appropriate chart types.`,

  report: `{
  "title": "Report title (string)",
  "abstract": "Brief summary of the report (string)",
  "sections": [
    {
      "title": "Section heading (string)",
      "content": "Detailed section content (string)"
    }
  ],
  "references": ["Reference citation (string)", ...]
}
Write in academic tone. Include an abstract, introduction, 3-6 body sections, conclusion, and references. Cite sources where applicable.`,

  interactive_section: `{
  "blocks": [
    {
      "type": "text | question | reveal | diagram | code | callout (string)",
      "content": "The block content — text, question prompt, hidden text, etc. (string)",
      "interaction": "Optional interaction type: click_to_reveal | fill_in_blank | drag_drop | toggle (string)"
    }
  ]
}
Mix passive reading with active engagement. Alternate between explanatory text blocks and interactive elements. Aim for an interaction every 2-3 blocks.`,
};

// ---------------------------------------------------------------------------
// Friendly content type labels
// ---------------------------------------------------------------------------

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  study_guide: "Study Guide",
  flashcards: "Flashcards",
  quiz: "Quiz",
  mock_exam: "Mock Exam",
  podcast_script: "Podcast Script",
  video_script: "Video Script",
  mind_map: "Mind Map",
  infographic_data: "Infographic Data",
  slide_deck: "Slide Deck",
  data_table: "Data Table",
  report: "Report",
  interactive_section: "Interactive Section",
};

// ---------------------------------------------------------------------------
// Review/validation JSON output schema (shared by reviewer, validator, fact_checker)
// ---------------------------------------------------------------------------

const REVIEW_OUTPUT_SCHEMA = `Your output MUST be valid JSON with this exact structure:
{
  "verdict": "approved" | "needs_changes" | "rejected",
  "issues": [
    {
      "field": "path or name of the problematic field (string)",
      "description": "what is wrong and how to fix it (string)",
      "severity": "critical" | "major" | "minor"
    }
  ],
  "enrichedContent": { ... }
}

Verdict rules:
- "approved" — content is accurate, complete, and ready. issues array may contain minor suggestions.
- "needs_changes" — content has major issues that must be fixed. enrichedContent must contain your corrected version.
- "rejected" — content is fundamentally flawed, factually wrong, or unsalvageable from the source. Explain why in issues.

enrichedContent must always match the original content type schema, with your corrections and improvements applied.`;

// ---------------------------------------------------------------------------
// System prompts per role
// ---------------------------------------------------------------------------

function creatorSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content creator specializing in university-level material.

Your task: generate a ${label} from the provided student-contributed source material.

Output requirements:
- Output ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.
- The JSON must match this schema exactly:

${schema}

Content rules:
- Extract and restructure information from the source material into the ${label} format.
- Use clear, precise academic language accessible to university students.
- Cover all major topics present in the source material proportionally.
- Do not fabricate information that is not supported by or inferable from the source.
- If the source material is insufficient for a complete ${label}, generate what you can and note gaps.
- All text should be educational in tone — informative, neutral, and student-friendly.`;
}

function reviewerSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content reviewer with deep expertise in academic quality assurance.

Your task: review a generated ${label} for accuracy, completeness, clarity, and pedagogical quality.

Evaluate the content on these criteria:
1. **Accuracy** — Does the content faithfully represent the source material? Are there factual errors or misrepresentations?
2. **Completeness** — Are all important topics from the source covered? Are there significant gaps?
3. **Clarity** — Is the language clear and appropriate for university students? Are explanations sufficient?
4. **Pedagogical value** — Does the content teach effectively? Is it well-structured for learning?
5. **Schema compliance** — Does the JSON match the expected ${label} format?

Expected schema for ${label}:
${schema}

${REVIEW_OUTPUT_SCHEMA}

Be thorough but fair. Flag genuine issues, not stylistic preferences.`;
}

function enricherSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content enricher. You take reviewed academic content and make it exceptional.

Your task: enhance a reviewed ${label} by adding depth, examples, and polish while preserving factual accuracy.

Enrichment goals:
1. **Add examples** — Insert concrete, relatable examples that illustrate abstract concepts.
2. **Improve explanations** — Expand thin explanations, add analogies, break down complex ideas.
3. **Refine language** — Improve readability, fix awkward phrasing, ensure consistent academic tone.
4. **Enhance engagement** — Make the content more interesting and student-friendly without sacrificing rigor.
5. **Fill gaps** — If the reviewer flagged missing content, add it where possible from the source material.

Rules:
- Preserve all factually correct content from the reviewed version.
- Do not remove correct information — only add, refine, or restructure.
- Do not introduce claims that are not supported by the source material.
- Output ONLY valid JSON matching the ${label} schema. No markdown, no code fences, no commentary.

Expected schema:
${schema}`;
}

function validatorSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are a factual accuracy and consistency validator for educational content.

Your task: validate a ${label} for factual correctness and internal consistency.

Validation checks:
1. **Factual correctness** — Are all claims, definitions, and explanations accurate? Cross-reference against the original source material.
2. **Internal consistency** — Do different parts of the content contradict each other? Are terms used consistently?
3. **Logical coherence** — Do explanations follow logically? Are cause-and-effect relationships correct?
4. **Source fidelity** — Does the content stay true to the source material? Has any meaning been distorted through paraphrasing?
5. **Schema compliance** — Does the JSON structure match the expected ${label} format?

Expected schema for ${label}:
${schema}

${REVIEW_OUTPUT_SCHEMA}

Be precise. Only flag issues you are confident about. For uncertain claims, note the uncertainty in the issue description rather than marking them as definitively wrong.`;
}

function factCheckerSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are a rigorous fact-checker for educational content. You cross-reference claims against established knowledge.

Your task: fact-check a ${label} by verifying claims against your knowledge base.

Fact-checking process:
1. **Verify key claims** — Check factual statements, statistics, dates, definitions, and formulas against known information.
2. **Flag inaccuracies** — Identify claims that are incorrect, outdated, or misleading.
3. **Check for omissions** — Note if critical caveats, exceptions, or context are missing from factual claims.
4. **Verify terminology** — Ensure technical terms are used correctly and consistently.
5. **Assess currency** — Flag information that may be outdated if the field has evolved.

Expected schema for ${label}:
${schema}

${REVIEW_OUTPUT_SCHEMA}

Rules:
- Only flag issues you can verify. Do not flag domain-specific claims from the source material that you cannot independently verify — note them as "unverifiable" instead.
- Apply corrections in enrichedContent for any confirmed errors.
- Be especially strict on definitions, formulas, and numerical claims — these must be exactly right.`;
}

// ---------------------------------------------------------------------------
// User prompts per role
// ---------------------------------------------------------------------------

/**
 * Find the best available output from previous steps.
 * If the preferred role was skipped, falls back through the chain
 * so downstream steps always have content to work with.
 */
function getLatestOutput(
  previousOutputs: { role: string; output: string }[],
  ...preferredRoles: string[]
): string {
  for (const role of preferredRoles) {
    const output = previousOutputs.find((o) => o.role === role)?.output;
    if (output) return output;
  }
  return "";
}

function creatorUser(sourceContent: string): string {
  return `Source material:\n\n${sourceContent}`;
}

function reviewerUser(
  sourceContent: string,
  previousOutputs: { role: string; output: string }[]
): string {
  const creatorOutput = getLatestOutput(previousOutputs, "creator");

  return `Original source material:\n\n${sourceContent}\n\n---\n\nGenerated content to review:\n\n${creatorOutput}`;
}

function enricherUser(
  sourceContent: string,
  previousOutputs: { role: string; output: string }[]
): string {
  // Falls back to creator output if reviewer was skipped
  const contentToEnrich = getLatestOutput(previousOutputs, "reviewer", "creator");

  return `Original source material:\n\n${sourceContent}\n\n---\n\nContent to enrich:\n\n${contentToEnrich}`;
}

function validatorUser(
  sourceContent: string,
  previousOutputs: { role: string; output: string }[]
): string {
  // Falls back through the chain if enricher or reviewer was skipped
  const contentToValidate = getLatestOutput(previousOutputs, "enricher", "reviewer", "creator");

  return `Original source material:\n\n${sourceContent}\n\n---\n\nContent to validate:\n\n${contentToValidate}`;
}

function factCheckerUser(
  sourceContent: string,
  previousOutputs: { role: string; output: string }[]
): string {
  // Falls back through the chain if validator, enricher, or reviewer was skipped
  const contentToCheck = getLatestOutput(previousOutputs, "validator", "enricher", "reviewer", "creator");

  return `Content to fact-check:\n\n${contentToCheck}\n\n---\n\nOriginal source material for reference:\n\n${sourceContent}`;
}

// ---------------------------------------------------------------------------
// Generator prompts (used by publisher after teacher verification)
// ---------------------------------------------------------------------------

function generatorSystem(contentType: ContentType): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content generator. Your task is to produce a high-quality ${label} from verified, fact-checked educational content.

The content you receive has been reviewed and verified by an expert panel of AI teachers — treat it as authoritative source material.

Output requirements:
- Output ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.
- The JSON must match this schema exactly:

${schema}

Content rules:
- Use the verified content as your primary source — it has been reviewed and fact-checked by multiple experts.
- Cover all major topics from the verified content proportionally.
- Use clear, precise academic language accessible to university students.
- Do not fabricate information not present in the verified content or original source.
- All text should be educational in tone — informative, neutral, and student-friendly.
- Ensure the output is comprehensive and production-ready.`;
}

function generatorUser(
  contentType: ContentType,
  verifiedContent: string,
  sourceContent: string
): string {
  const label = CONTENT_TYPE_LABELS[contentType];

  return `Verified content (reviewed and fact-checked by expert panel):

${verifiedContent}

---

Original source material for reference:

${sourceContent}

---

Generate a complete ${label} from the above content. Output ONLY valid JSON matching the required schema.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the human-readable JSON schema description for a content type.
 * Useful for documentation, UI tooltips, or passing to other systems.
 */
export function getContentTypeSchema(contentType: ContentType): string {
  return CONTENT_TYPE_SCHEMAS[contentType];
}

/**
 * Build system + user prompts for a generator step.
 * Used by the publisher after the 5-teacher verification pipeline completes.
 */
export function getGeneratorPrompt(
  contentType: ContentType,
  verifiedContent: string,
  sourceContent: string
): { system: string; user: string } {
  return {
    system: generatorSystem(contentType),
    user: generatorUser(contentType, verifiedContent, sourceContent),
  };
}

/**
 * Build the system and user prompts for a given pipeline step.
 *
 * @param role          - Which pipeline role is being prompted
 * @param contentType   - The content type being generated/reviewed
 * @param sourceContent - The original student-contributed source material
 * @param previousStepOutputs - Outputs from earlier pipeline steps (role + raw output string)
 * @returns `{ system, user }` ready to send to the AI provider
 */
export function getPrompt(
  role: ModelRole,
  contentType: ContentType,
  sourceContent: string,
  previousStepOutputs?: { role: string; output: string }[]
): { system: string; user: string } {
  const outputs = previousStepOutputs ?? [];

  switch (role) {
    case "creator":
      return {
        system: creatorSystem(contentType),
        user: creatorUser(sourceContent),
      };

    case "reviewer":
      return {
        system: reviewerSystem(contentType),
        user: reviewerUser(sourceContent, outputs),
      };

    case "enricher":
      return {
        system: enricherSystem(contentType),
        user: enricherUser(sourceContent, outputs),
      };

    case "validator":
      return {
        system: validatorSystem(contentType),
        user: validatorUser(sourceContent, outputs),
      };

    case "fact_checker":
      return {
        system: factCheckerSystem(contentType),
        user: factCheckerUser(sourceContent, outputs),
      };

    case "generator":
      throw new Error(
        "Generator role uses getGeneratorPrompt() — do not call getPrompt() for generators"
      );

    default: {
      const _exhaustive: never = role;
      throw new Error(`Unknown role: ${_exhaustive}`);
    }
  }
}
