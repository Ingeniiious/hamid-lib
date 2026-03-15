// ---------------------------------------------------------------------------
// AI Council -- prompt templates for the 5-role pipeline
// ---------------------------------------------------------------------------

import type { ContentType, ModelRole } from "./types";
import { getLanguageName } from "./translation";

/** Course context for content validation in the creator step */
export interface CourseContext {
  courseName: string;
  facultyName?: string;
  universityName?: string;
}

/**
 * Build the explicit language rule block for prompts.
 * When sourceLanguage is provided, it gives an unambiguous instruction.
 * This prevents models from inferring the wrong language from context
 * (e.g., seeing a Turkish university name in English content).
 */
function languageRuleBlock(sourceLanguage?: string | null): string {
  if (sourceLanguage) {
    const langName = getLanguageName(sourceLanguage);
    return `LANGUAGE RULE (CRITICAL — NON-NEGOTIABLE):
- The source language has been detected as: **${langName}** (code: ${sourceLanguage}).
- You MUST produce ALL content in ${langName}.
- To determine the content language, look at the ENTIRE source text and check the language ratio across ALL of it — not just the header, title, or metadata at the top. The actual body text is what matters.
- University names, professor names, institution names, and course metadata may be in a different language — IGNORE those for language detection. They are proper nouns, not indicators of the content language.
- Do NOT switch to a different language even if you see names, institutions, or terms from another language/culture.
- Use the academic register and terminology conventions appropriate for ${langName}.`;
  }

  // Fallback when language is unknown — use the old heuristic
  return `LANGUAGE RULE (CRITICAL):
- You MUST produce ALL content in the SAME LANGUAGE as the majority of the source material text.
- To determine the content language, look at the ENTIRE source text and check the language ratio across ALL of it — not just the header, title, or metadata at the top. The actual body text is what matters.
- University names, professor names, institution names, and course metadata may be in a different language — IGNORE those for language detection. They are proper nouns, not indicators of the content language.
- If the source text body is 90%+ English but mentions Turkish/Persian/etc. names and institutions, the language is ENGLISH — write in English.
- Do NOT translate the source material into a different language. Match the dominant language of the actual content.
- Use the academic register and terminology conventions appropriate for that language.`;
}

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
  "suggestedTimeMinutes": 10,
  "questions": [
    {
      "question": "The question text (string)",
      "type": "multiple_choice" | "true_false",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct (string)"
    }
  ]
}
IMPORTANT — this quiz is graded AUTOMATICALLY by code, not by a human or AI:
- "suggestedTimeMinutes": estimate how many minutes an average university student would need to complete this quiz. Be realistic — consider reading time, thinking time, and question difficulty.
- ONLY use "multiple_choice" and "true_false" types. No short answer, no essay, no free-text.
- "options" is REQUIRED for every question — always an array of strings.
  - multiple_choice: exactly 4 options.
  - true_false: exactly ["True", "False"].
- "correctIndex" is the 0-based index of the correct option in the "options" array (integer).
- Generate 10-20 questions. ~70% multiple choice, ~30% true/false.
- Keep questions concise, focused on single concepts.
- Distractors should be plausible but clearly wrong.
- Every question must have a brief, helpful explanation.
- Order randomly — this is casual practice, not a graded test.`,

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
  "title": "Exam title, e.g. Midterm Exam — Introduction to Economics (string)",
  "totalPoints": 100,
  "suggestedTimeMinutes": 90,
  "instructions": "General exam instructions for the student (string)",
  "sections": [
    {
      "title": "Section name, e.g. Part A: Multiple Choice (string)",
      "points": 25,
      "questions": [
        {
          "question": "The question text (string)",
          "type": "multiple_choice" | "true_false" | "short_answer" | "fill_in_blank" | "matching" | "essay" | "calculation",
          "grading": "auto" | "ai",
          "points": 2,
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "matchPairs": [{"left": "Term", "right": "Definition"}],
          "correctMatchOrder": [2, 0, 1],
          "rubric": "Grading criteria for AI-graded questions (string)",
          "sampleAnswer": "A model answer for AI-graded questions (string)",
          "explanation": "Why this answer is correct — shown AFTER the student submits (string)"
        }
      ]
    }
  ]
}
Simulate a REAL university exam paper with TWO grading modes:

GRADING RULES (CRITICAL):
- "grading": "auto" → graded instantly by code. Use for: multiple_choice, true_false, matching.
- "grading": "ai" → graded by a cheap AI model. Use for: short_answer, fill_in_blank, essay, calculation.

AUTO-GRADED questions (grading: "auto"):
- multiple_choice: MUST have "options" (4 items) + "correctIndex" (0-based index). Omit rubric/sampleAnswer.
- true_false: MUST have "options": ["True", "False"] + "correctIndex" (0 or 1). Omit rubric/sampleAnswer.
- matching: MUST have "matchPairs" (array of {left, right} in SHUFFLED order for display) + "correctMatchOrder" (array of indices mapping each left item to its correct right item). Omit options/correctIndex.

AI-GRADED questions (grading: "ai"):
- short_answer / fill_in_blank / essay / calculation: MUST have "rubric" (clear grading criteria with point breakdown) + "sampleAnswer" (model answer for the AI grader to compare against). Omit options/correctIndex/matchPairs.

EXAM STRUCTURE:
- 3-5 sections with different question types (do NOT make all sections multiple choice).
- Section 1: quick recall — multiple_choice + true_false (auto-graded, 1-2 pts each).
- Section 2: applied — short_answer + fill_in_blank + matching (mix of auto + ai, 3-5 pts each).
- Section 3+: deep understanding — essay + calculation (ai-graded, 10-20 pts each).
- Total ~100 points across 25-40 questions.
- Progress easy → medium → hard within and across sections.
- Only include fields relevant to each question type — omit unused fields.
- Cover all major topics proportionally.`,

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
      "speaker": "Host or Expert (string — ALWAYS use exactly these two speakers)",
      "text": "What the speaker says, with optional Grok TTS speech tags (string)"
    }
  ],
  "totalDuration": "Estimated total duration, e.g. 15:00 (string)"
}

SPEAKERS: Use EXACTLY 2 speakers — "Host" and "Expert". No other speaker names.

GROK TTS SPEECH TAGS: Embed speech tags in the "text" field to control delivery, emotion, and vocal expression. There are two kinds of tags:

INLINE TAGS — placed at the point where the expression naturally occurs:
- Pauses: [pause], [long-pause], [hum-tune]
- Laughter: [laugh], [chuckle], [giggle], [cry]
- Mouth sounds: [tsk], [tongue-click], [lip-smack]
- Breathing: [breath], [inhale], [exhale], [sigh]

WRAPPING TAGS — wrap around complete phrases (not individual words):
- Volume: <soft>text</soft>, <whisper>text</whisper>, <loud>text</loud>, <build-intensity>text</build-intensity>, <decrease-intensity>text</decrease-intensity>
- Pitch/speed: <higher-pitch>text</higher-pitch>, <lower-pitch>text</lower-pitch>, <slow>text</slow>, <fast>text</fast>
- Style: <sing-song>text</sing-song>, <singing>text</singing>, <laugh-speak>text</laugh-speak>, <emphasis>text</emphasis>

Tag placement examples:
- Inline: "Really? [laugh] That's incredible!"
- Wrapping: "<soft>Let me explain this carefully.</soft>"
- Dramatic timing: "And the answer is... [long-pause] not what you'd expect."
- Combined styles: "<slow><soft>Goodnight, sleep well.</soft></slow>"
- With punctuation: "Wait, seriously? [chuckle] <emphasis>That changes everything!</emphasis>"

USAGE GUIDELINES:
- Place inline tags where the expression would naturally occur in speech.
- Use wrapping tags around complete phrases, not single words.
- Combine tags with punctuation for natural results.
- Use [pause] or [long-pause] for dramatic timing and emphasis.
- You can nest wrapping tags for combined effects (e.g., <slow><soft>...</soft></slow>).
- About 30-40% of segments should use speech tags. Do NOT tag every single line — let some lines breathe without any tags.
- Tags should add genuine emotion and make the podcast feel alive, not robotic or over-produced.

BRANDING (MANDATORY — weave these naturally into the script):
- INTRO (first segment): Host must open with a warm welcome: "Welcome to the Libraryyy Podcast" followed by the course name and a brief teaser of what this episode covers.
- MID-ROLL BREAKS (2-3 times, spaced evenly through the episode): Insert a brief ~10-second branding moment where a speaker naturally references the platform. Examples:
  - "You're listening to the Libraryyy Podcast — free study resources for university students everywhere."
  - "This episode is brought to you by Libraryyy.com — your open-source university study companion."
  - "If you're finding this helpful, check out Libraryyy.com for flashcards, study guides, and more on this topic."
  - "Libraryyy.com — where students help students learn better, for free."
  Keep these varied and conversational — never repeat the exact same line. They should feel like natural asides, not forced ads.
- OUTRO (last 1-2 segments): Host wraps up with: "This podcast was created by Libraryyy.com" and encourages listeners to explore the platform for more study materials.
- PRONUNCIATION: "Libraryyy" is pronounced "Library" with a longer 'y' sound — spell it as "Libraryyy" in the script (the TTS will handle pronunciation).

Structure as a conversational dialogue between Host and Expert. Include an intro, main discussion with 3-5 key segments, and a closing summary. Aim for 10-20 minutes of content.`,

  video_script: `{
  "scenes": [
    {
      "title": "Scene title (string)",
      "narration": "Voiceover text that directly teaches by referencing the visual (string)",
      "visualDescription": "What the viewer sees on screen — used for human review only (string)",
      "imagePrompt": "Concise image generation prompt for AI (Nano Banana 2) — what to DRAW on the branded background (string)",
      "duration": "Estimated duration, e.g. 30s, 1m (string)"
    }
  ]
}

NARRATION STYLE (MANDATORY — this is NOT a podcast):
- This is a VISUAL TEACHING video. The narration must directly reference and explain what the viewer sees on screen.
- Use phrases like: "As you can see here...", "Notice how...", "Looking at this diagram...", "On the left side, we have...", "The arrows show..."
- The narration should teach the concept BY describing the visual. Every sentence should connect to what's being shown.
- Do NOT make it conversational or discussion-based like a podcast. It is a single narrator teaching directly.
- Keep the tone clear, educational, and focused. Like a professor explaining a slide.

IMAGE PROMPT GUIDELINES (for the "imagePrompt" field):
- The imagePrompt is passed to Nano Banana 2 (Gemini 3.1 Flash Image) alongside a branded background template image.
- The AI image generator receives the branded background + your prompt, and draws educational content ON TOP of the background while preserving the template's logo, branding, and layout.
- Write prompts as descriptive narrative sentences, NOT keyword lists. Example:
  GOOD: "Using the provided background, draw a clear labeled flowchart in the center showing the 4 stages of the water cycle: evaporation, condensation, precipitation, and collection. Connect each stage with curved arrows. Use soft blue and green colors. Keep all text labels short (1-2 words each)."
  BAD: "water cycle, flowchart, arrows, blue, evaporation"
- Always start with "Using the provided background, draw..." or "On the provided template, illustrate..." so the model knows to preserve the background.
- Focus on educational visuals: diagrams, flowcharts, comparisons, labeled illustrations, equations, timelines, process flows, concept maps, graphs, charts.
- Be hyper-specific about layout and positioning: "in the center", "on the left side", "at the top", "arranged in a 2x2 grid".
- Use short labels, numbers, and arrows. Do NOT request paragraphs of text in the image.
- Specify colors and style: "clean, modern diagram with soft colors" or "whiteboard-style sketch with blue marker".
- Keep prompts 50-150 words. Descriptive enough to be specific, concise enough to stay focused.
- Think about what a professor would draw on a whiteboard to explain the concept.

BRANDING (MANDATORY):
- INTRO (first scene): Narration must open with "Welcome to Libraryyy" and introduce the topic.
- OUTRO (last scene): Narration must close with "This video was created by Libraryyy.com" and encourage exploring the platform.
- Do NOT add mid-roll branding like podcasts. The branded background template already has the logo visible in every scene.

Structure as a visual learning experience. Include an intro scene, main content in logical scenes (8-15 scenes), and a closing recap.`,

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

function creatorSystem(contentType: ContentType, courseContext?: CourseContext, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  const validationBlock = courseContext
    ? `
CONTENT VALIDATION (MUST DO FIRST):
Before generating any content, you MUST validate that the source material is genuinely related to the claimed course. The student claims this content is for:
- Course: ${courseContext.courseName}${courseContext.facultyName ? `\n- Faculty/Department: ${courseContext.facultyName}` : ""}${courseContext.universityName ? `\n- University: ${courseContext.universityName}` : ""}

Validation checks:
1. Does the source material appear to be legitimate educational/academic content?
2. Is the subject matter reasonably related to the claimed course name?
3. Does the content appear to be genuine course material (lecture notes, textbook excerpts, assignments, etc.) rather than fabricated, random, or harmful content?

If the content FAILS validation (clearly unrelated, fabricated, harmful, or designed to trick/harm other students), respond with ONLY this JSON:
{
  "validation": "rejected",
  "reason": "Brief explanation of why this content was rejected"
}

If the content PASSES validation, proceed with generating the ${label} as instructed below. Do NOT include a "validation" field in your output — just output the content directly.

`
    : "";

  return `You are an exceptional university professor and teacher. You are passionate about helping students truly understand and master course material.
${validationBlock}Your task: You have been given extracted course material contributed by a student. Imagine you are teaching this course — your job is to create a comprehensive ${label} that teaches this material in the best possible way. Explain every concept thoroughly. Leave nothing out.

${languageRuleBlock(sourceLanguage)}

CRITICAL RULES:
- Do NOT delete, compress, or skip ANY information from the source material. Every single piece of information must be preserved and expanded upon.
- Your output should be LONGER and MORE DETAILED than the source material, not shorter. You are teaching, not summarizing.
- For every concept in the source, explain: what it is, why it matters, how it works, and how it connects to other concepts.
- Add clear examples and analogies to make abstract concepts concrete and relatable.
- Break down complex ideas into digestible steps — teach it like you would to a student who is seeing this for the first time.
- Use clear, precise academic language that is accessible to university students.
- Do not fabricate information that is not supported by or inferable from the source material.
- If the source material is thin on a topic, expand on it using your knowledge while staying faithful to the course context.
- All text should be educational in tone: informative, engaging, and student-friendly.
- Cover all major topics present in the source material proportionally. Give more depth to complex topics.

Writing style (MANDATORY):
- Write like a human educator, not like an AI. Keep it natural and conversational where appropriate.
- NEVER use em dashes (—). Use commas, periods, semicolons, or rewrite the sentence instead.
- Avoid overusing colons to introduce lists or explanations. Prefer natural sentence flow.
- Do not start sentences with "In this section" or "This section covers". Just teach the content directly.
- Avoid filler phrases like "It is important to note that", "It should be noted", "Let's explore", "Let's dive into".
- Keep sentences concise. Prefer short, clear sentences over long compound ones.

Output requirements:
- Output ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.
- The JSON must match this schema exactly:

${schema}`;
}

function reviewerSystem(contentType: ContentType, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content reviewer with deep expertise in academic quality assurance.

Your task: review a generated ${label} for accuracy, completeness, clarity, and pedagogical quality.

${languageRuleBlock(sourceLanguage)}
- You MUST write all feedback, corrections, and enrichedContent in the same language as the source content.

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

function enricherSystem(contentType: ContentType, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content enricher. You take reviewed academic content and make it exceptional.

Your task: enhance a reviewed ${label} by adding depth, examples, and polish while preserving factual accuracy.

${languageRuleBlock(sourceLanguage)}
- Add examples and analogies that are culturally relevant to the language/region of the source material.

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

function validatorSystem(contentType: ContentType, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are a factual accuracy and consistency validator for educational content.

Your task: validate a ${label} for factual correctness and internal consistency.

${languageRuleBlock(sourceLanguage)}
- You MUST write all feedback, corrections, and enrichedContent in the same language as the source content.

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

function factCheckerSystem(contentType: ContentType, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are a rigorous fact-checker for educational content. You cross-reference claims against established knowledge.

Your task: fact-check a ${label} by verifying claims against your knowledge base.

${languageRuleBlock(sourceLanguage)}
- You MUST write all feedback, corrections, and enrichedContent in the same language as the source content.

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

function generatorSystem(contentType: ContentType, sourceLanguage?: string | null): string {
  const label = CONTENT_TYPE_LABELS[contentType];
  const schema = CONTENT_TYPE_SCHEMAS[contentType];

  return `You are an expert educational content generator. Your task is to produce a high-quality ${label} from verified, fact-checked educational content.

The content you receive has been reviewed and verified by an expert panel of AI teachers — treat it as authoritative source material.

${languageRuleBlock(sourceLanguage)}

Output requirements:
- Output ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON.
- The JSON must match this schema exactly:

${schema}

Content rules:
- Use the verified content as your primary source. It has been reviewed and fact-checked by multiple experts.
- Cover all major topics from the verified content proportionally.
- Use clear, precise academic language accessible to university students.
- Do not fabricate information not present in the verified content or original source.
- All text should be educational in tone: informative, neutral, and student-friendly.
- Ensure the output is comprehensive and production-ready.

Writing style (MANDATORY):
- Write like a human educator, not like an AI. Keep it natural and conversational where appropriate.
- NEVER use em dashes (—). Use commas, periods, semicolons, or rewrite the sentence instead.
- Avoid overusing colons to introduce lists or explanations. Prefer natural sentence flow.
- Do not start sentences with "In this section" or "This section covers". Just teach the content directly.
- Avoid filler phrases like "It is important to note that", "It should be noted", "Let's explore", "Let's dive into".
- Keep sentences concise. Prefer short, clear sentences over long compound ones.`;
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
  sourceContent: string,
  sourceLanguage?: string | null,
): { system: string; user: string } {
  return {
    system: generatorSystem(contentType, sourceLanguage),
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
  previousStepOutputs?: { role: string; output: string }[],
  courseContext?: CourseContext,
  sourceLanguage?: string | null,
): { system: string; user: string } {
  const outputs = previousStepOutputs ?? [];

  switch (role) {
    case "creator":
      return {
        system: creatorSystem(contentType, courseContext, sourceLanguage),
        user: creatorUser(sourceContent),
      };

    case "reviewer":
      return {
        system: reviewerSystem(contentType, sourceLanguage),
        user: reviewerUser(sourceContent, outputs),
      };

    case "enricher":
      return {
        system: enricherSystem(contentType, sourceLanguage),
        user: enricherUser(sourceContent, outputs),
      };

    case "validator":
      return {
        system: validatorSystem(contentType, sourceLanguage),
        user: validatorUser(sourceContent, outputs),
      };

    case "fact_checker":
      return {
        system: factCheckerSystem(contentType, sourceLanguage),
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
