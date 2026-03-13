// ---------------------------------------------------------------------------
// AI Grading — Kimi-powered grading for mock exam open-ended questions
//
// Quiz = 100% code-graded (MC + T/F only, instant)
// Mock Exam = hybrid:
//   - auto questions (MC, T/F, matching) → code-graded instantly
//   - ai questions (short answer, fill-in-blank, essay, calculation) → Kimi grades
// ---------------------------------------------------------------------------

import { complete } from "@/lib/ai/client";
import type { QuizContent, MockExamContent } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What the student submits for a quiz */
export interface QuizSubmission {
  /** answers[i] = index the student picked for question i */
  answers: number[];
  timeSpentSeconds?: number;
}

/** What the student submits for a mock exam */
export interface MockExamSubmission {
  /** answers keyed by "sectionIndex-questionIndex" → student's answer */
  answers: Record<string, string | number | number[]>;
  timeSpentSeconds?: number;
}

/** Result for a single question */
export interface QuestionResult {
  questionId: string;           // "q3" for quiz, "s0-q2" for mock exam section 0 question 2
  verdict: "correct" | "partial" | "incorrect";
  pointsEarned: number;
  pointsPossible: number;
  grading: "auto" | "ai";
  feedback?: string;            // AI feedback for ai-graded questions
}

/** Full grading result */
export interface GradingResult {
  results: QuestionResult[];
  totalScore: number;
  totalPossible: number;
  autoScore: number;
  aiScore: number;
  // AI grading metadata (only if AI questions exist)
  gradingModel?: string;
  gradingTokens?: number;
  gradingCostUsd?: number;
}

// ---------------------------------------------------------------------------
// Quiz grading — pure code, no AI needed
// ---------------------------------------------------------------------------

export function gradeQuiz(
  content: QuizContent,
  submission: QuizSubmission,
): GradingResult {
  const results: QuestionResult[] = [];
  let totalScore = 0;
  const totalPossible = content.questions.length; // 1 point per question

  for (let i = 0; i < content.questions.length; i++) {
    const q = content.questions[i];
    const studentAnswer = submission.answers[i];
    const isCorrect = studentAnswer === q.correctIndex;

    const earned = isCorrect ? 1 : 0;
    totalScore += earned;

    results.push({
      questionId: `q${i}`,
      verdict: isCorrect ? "correct" : "incorrect",
      pointsEarned: earned,
      pointsPossible: 1,
      grading: "auto",
    });
  }

  return {
    results,
    totalScore,
    totalPossible,
    autoScore: totalScore,
    aiScore: 0,
  };
}

// ---------------------------------------------------------------------------
// Mock exam grading — hybrid (auto + AI)
// ---------------------------------------------------------------------------

export async function gradeMockExam(
  content: MockExamContent,
  submission: MockExamSubmission,
): Promise<GradingResult> {
  const results: QuestionResult[] = [];
  let autoScore = 0;
  let totalPossible = 0;

  // Collect AI questions that need grading
  const aiQuestions: {
    questionId: string;
    question: string;
    type: string;
    points: number;
    studentAnswer: string;
    rubric: string;
    sampleAnswer: string;
  }[] = [];

  for (let si = 0; si < content.sections.length; si++) {
    const section = content.sections[si];
    for (let qi = 0; qi < section.questions.length; qi++) {
      const q = section.questions[qi];
      const qid = `s${si}-q${qi}`;
      const studentAnswer = submission.answers[qid];
      totalPossible += q.points;

      if (q.grading === "auto") {
        // Code-grade: MC, T/F, matching
        const result = gradeAutoQuestion(q, studentAnswer);
        autoScore += result.pointsEarned;
        results.push({ ...result, questionId: qid });
      } else {
        // Queue for AI grading
        aiQuestions.push({
          questionId: qid,
          question: q.question,
          type: q.type,
          points: q.points,
          studentAnswer: String(studentAnswer ?? ""),
          rubric: q.rubric ?? "",
          sampleAnswer: q.sampleAnswer ?? "",
        });
      }
    }
  }

  // AI-grade all open-ended questions in one batch call to Kimi
  let aiScore = 0;
  let gradingTokens = 0;
  let gradingCostUsd = 0;

  if (aiQuestions.length > 0) {
    const aiResults = await gradeWithKimi(aiQuestions);
    gradingTokens = aiResults.tokens;
    gradingCostUsd = aiResults.costUsd;

    for (const ar of aiResults.grades) {
      aiScore += ar.pointsEarned;
      results.push(ar);
    }
  }

  return {
    results,
    totalScore: autoScore + aiScore,
    totalPossible,
    autoScore,
    aiScore,
    gradingModel: aiQuestions.length > 0 ? "kimi" : undefined,
    gradingTokens: gradingTokens || undefined,
    gradingCostUsd: gradingCostUsd || undefined,
  };
}

// ---------------------------------------------------------------------------
// Auto-grade a single question (MC, T/F, matching)
// ---------------------------------------------------------------------------

function gradeAutoQuestion(
  q: MockExamContent["sections"][0]["questions"][0],
  studentAnswer: string | number | number[] | undefined,
): Omit<QuestionResult, "questionId"> {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === "") {
    return { verdict: "incorrect", pointsEarned: 0, pointsPossible: q.points, grading: "auto" };
  }

  switch (q.type) {
    case "multiple_choice":
    case "true_false": {
      const isCorrect = Number(studentAnswer) === q.correctIndex;
      return {
        verdict: isCorrect ? "correct" : "incorrect",
        pointsEarned: isCorrect ? q.points : 0,
        pointsPossible: q.points,
        grading: "auto",
      };
    }

    case "matching": {
      if (!q.correctMatchOrder || !Array.isArray(studentAnswer)) {
        return { verdict: "incorrect", pointsEarned: 0, pointsPossible: q.points, grading: "auto" };
      }
      const correctOrder = q.correctMatchOrder;
      const studentOrder = studentAnswer as number[];
      let correctCount = 0;
      for (let i = 0; i < correctOrder.length; i++) {
        if (studentOrder[i] === correctOrder[i]) correctCount++;
      }
      const ratio = correctOrder.length > 0 ? correctCount / correctOrder.length : 0;
      const earned = Math.round(q.points * ratio * 100) / 100;
      return {
        verdict: ratio === 1 ? "correct" : ratio > 0 ? "partial" : "incorrect",
        pointsEarned: earned,
        pointsPossible: q.points,
        grading: "auto",
      };
    }

    default:
      return { verdict: "incorrect", pointsEarned: 0, pointsPossible: q.points, grading: "auto" };
  }
}

// ---------------------------------------------------------------------------
// AI grading via Kimi — batch all questions in one call
// ---------------------------------------------------------------------------

async function gradeWithKimi(
  questions: {
    questionId: string;
    question: string;
    type: string;
    points: number;
    studentAnswer: string;
    rubric: string;
    sampleAnswer: string;
  }[],
): Promise<{
  grades: QuestionResult[];
  tokens: number;
  costUsd: number;
}> {
  const questionsBlock = questions.map((q, i) => `
--- Question ${i + 1} (ID: ${q.questionId}, type: ${q.type}, max points: ${q.points}) ---
Question: ${q.question}
Rubric: ${q.rubric}
Sample answer: ${q.sampleAnswer}
Student's answer: ${q.studentAnswer}
`).join("\n");

  const systemPrompt = `You are a strict but fair university exam grader. You grade student answers against a rubric and sample answer.

For EACH question, return a JSON object with:
- "questionId": the exact question ID provided
- "pointsEarned": number (0 to max points, can be decimal for partial credit)
- "verdict": "correct" | "partial" | "incorrect"
- "feedback": brief feedback explaining the grade (1-2 sentences, in the SAME language as the question)

Rules:
- Award partial credit when the student demonstrates understanding but is incomplete or has minor errors.
- For calculations: check the method AND the final answer. Correct method with arithmetic error = partial credit.
- For essays: grade against the rubric criteria. Missing a major point = deduction.
- For fill-in-blank: accept equivalent answers (synonyms, different phrasing of the same concept). Be lenient on spelling if the meaning is clear.
- For short answers: compare meaning, not exact wording. If the student's answer conveys the same concept as the sample answer, it's correct.
- An empty or blank answer always gets 0 points.
- Be generous with partial credit — students who demonstrate effort and partial understanding should be rewarded.

Output ONLY valid JSON — an array of grading objects, one per question. No markdown, no code fences.`;

  const userPrompt = `Grade these ${questions.length} exam questions:
${questionsBlock}

Output a JSON array with exactly ${questions.length} objects, in the same order as the questions above.`;

  const response = await complete({
    model: "kimi",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    maxTokens: 4096,
    responseFormat: "json",
  });

  // Parse response
  let parsed: { questionId: string; pointsEarned: number; verdict: string; feedback: string }[];
  try {
    let raw = response.content.trim();
    const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    if (fenceMatch) raw = fenceMatch[1].trim();
    const data = JSON.parse(raw);
    parsed = Array.isArray(data) ? data : data.grades ?? data.results ?? [];
  } catch {
    // Fallback: give 0 to all questions if AI response is invalid
    console.error("[grading] Kimi returned invalid JSON, falling back to 0 scores");
    parsed = questions.map((q) => ({
      questionId: q.questionId,
      pointsEarned: 0,
      verdict: "incorrect",
      feedback: "AI grading failed — please contact support for manual review.",
    }));
  }

  // Map parsed results back, preserving order
  const grades: QuestionResult[] = questions.map((q) => {
    const grade = parsed.find((p) => p.questionId === q.questionId);
    if (!grade) {
      return {
        questionId: q.questionId,
        verdict: "incorrect" as const,
        pointsEarned: 0,
        pointsPossible: q.points,
        grading: "ai" as const,
        feedback: "AI grading failed for this question.",
      };
    }
    // Clamp points to [0, max]
    const earned = Math.min(Math.max(Number(grade.pointsEarned) || 0, 0), q.points);
    return {
      questionId: q.questionId,
      verdict: (grade.verdict === "correct" || grade.verdict === "partial" || grade.verdict === "incorrect"
        ? grade.verdict
        : earned === q.points ? "correct" : earned > 0 ? "partial" : "incorrect") as "correct" | "partial" | "incorrect",
      pointsEarned: earned,
      pointsPossible: q.points,
      grading: "ai" as const,
      feedback: grade.feedback || undefined,
    };
  });

  // Cost: Kimi K2.5 = $0.60/M input, $3.00/M output
  const costUsd =
    response.inputTokens * (0.60 / 1_000_000) +
    response.outputTokens * (3.00 / 1_000_000);

  return {
    grades,
    tokens: response.inputTokens + response.outputTokens,
    costUsd,
  };
}
