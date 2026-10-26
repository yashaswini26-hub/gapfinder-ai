import {
  Topic,
  TopicMastery,
  TopicStatus,
  ConfidenceLevel,
  GapDiagnosisReport,
  SourceReference,
} from "@/types";
import { createAdminClient } from "@/lib/supabase/server";
import { SAMPLE_TOPIC_MASTERY, SAMPLE_TOPICS, SAMPLE_SUBJECT } from "@/lib/demo/sample-data";

// ==========================================
// Configurable Mastery & Confidence Settings
// ==========================================

export interface GapEngineConfig {
  thresholds: {
    weakMax: number; // Below 50.00
    mediumMax: number; // 50.00 to 79.99
    strongMin: number; // 80.00 to 100.00
  };
  difficultyWeights: {
    easy: number;
    medium: number;
    hard: number;
  };
  confidenceThresholds: {
    lowMaxQuestions: number; // < 3 questions -> low confidence
    mediumMaxQuestions: number; // 3 to 5 questions -> medium confidence
    highMinQuestions: number; // >= 6 questions -> high confidence
  };
}

export const DEFAULT_GAP_CONFIG: GapEngineConfig = {
  thresholds: {
    weakMax: 50.0,
    mediumMax: 80.0,
    strongMin: 80.0,
  },
  difficultyWeights: {
    easy: 1.0,
    medium: 1.25,
    hard: 1.5,
  },
  confidenceThresholds: {
    lowMaxQuestions: 2,
    mediumMaxQuestions: 5,
    highMinQuestions: 6,
  },
};

export interface AssessedQuestionRecord {
  questionId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  awardedMarks: number;
  maximumMarks: number;
  isCorrect: boolean | null;
  feedback?: string | null;
  attemptId: string;
  submittedAt: string;
  sourceReferences: SourceReference[];
}

export interface TopicCalculationResult {
  topicId: string;
  masteryScore: number | null;
  status: TopicStatus;
  confidence: ConfidenceLevel;
  questionCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  evidenceSummary: string;
  missedConcepts: string[];
  citations: SourceReference[];
  recommendedAction: string;
}

/**
 * Pure deterministic calculation for a single topic's diagnostic mastery.
 */
export function calculateTopicMastery(
  topicId: string,
  records: AssessedQuestionRecord[],
  config: GapEngineConfig = DEFAULT_GAP_CONFIG
): TopicCalculationResult {
  // If no questions have been attempted for this topic:
  if (!records || records.length === 0) {
    return {
      topicId,
      masteryScore: null,
      status: "insufficient_data",
      confidence: "low",
      questionCount: 0,
      correctCount: 0,
      partialCount: 0,
      incorrectCount: 0,
      evidenceSummary: "Insufficient diagnostic coverage: No completed questions recorded for this topic.",
      missedConcepts: [],
      citations: [],
      recommendedAction: "Take an initial diagnostic quiz on this topic to establish your baseline mastery.",
    };
  }

  let weightedEarned = 0;
  let weightedPossible = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  const missedConcepts: string[] = [];
  const citationMap = new Map<string, SourceReference>();

  for (const rec of records) {
    const weight = config.difficultyWeights[rec.difficulty] ?? 1.0;
    const earned = Math.max(0, Math.min(rec.maximumMarks, rec.awardedMarks));
    const maxPossible = Math.max(0.1, rec.maximumMarks);

    weightedEarned += earned * weight;
    weightedPossible += maxPossible * weight;

    const ratio = earned / maxPossible;
    if (ratio >= 0.85) {
      correctCount++;
    } else if (ratio > 0.2) {
      partialCount++;
      if (rec.feedback) missedConcepts.push(rec.feedback);
    } else {
      incorrectCount++;
      if (rec.feedback) missedConcepts.push(rec.feedback);
    }

    // Collect source citations
    for (const ref of rec.sourceReferences || []) {
      if (ref.chunk_id) {
        citationMap.set(ref.chunk_id, ref);
      }
    }
  }

  // Calculate percentage: 100 * weighted_earned / weighted_possible
  const rawScore = weightedPossible > 0 ? (100 * weightedEarned) / weightedPossible : 0;
  const masteryScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 10) / 10;

  // Determine status from thresholds
  let status: TopicStatus;
  if (masteryScore < config.thresholds.weakMax) {
    status = "weak";
  } else if (masteryScore < config.thresholds.mediumMax) {
    status = "medium";
  } else {
    status = "strong";
  }

  // Determine confidence from sample size and attempt variance
  let confidence: ConfidenceLevel;
  if (records.length <= config.confidenceThresholds.lowMaxQuestions) {
    confidence = "low";
  } else if (records.length <= config.confidenceThresholds.mediumMaxQuestions) {
    confidence = "medium";
  } else {
    confidence = "high";
  }

  // Evidence summary and actionable recommendation
  let evidenceSummary = "";
  let recommendedAction = "";

  if (status === "weak") {
    evidenceSummary = `Identified knowledge gap (${masteryScore}% mastery across ${records.length} question${records.length > 1 ? "s" : ""}). ${incorrectCount} missed question${incorrectCount > 1 ? "s" : ""} showed fundamental misconceptions.`;
    recommendedAction = `Prioritize immediate revision of source materials before attempting new practice questions.`;
  } else if (status === "medium") {
    evidenceSummary = `Moderate understanding (${masteryScore}% mastery across ${records.length} question${records.length > 1 ? "s" : ""}). Demonstrates general comprehension but lacks precision in edge cases or definitions.`;
    recommendedAction = `Review partial credit feedback and complete 3 targeted practice questions to solidify mastery.`;
  } else {
    evidenceSummary = `Solid mastery demonstrated (${masteryScore}% mastery across ${records.length} question${records.length > 1 ? "s" : ""}). Consistently answered core and difficult concepts accurately.`;
    recommendedAction = `Ready for exam day. Schedule spaced retention review 2 days before the exam.`;
  }

  return {
    topicId,
    masteryScore,
    status,
    confidence,
    questionCount: records.length,
    correctCount,
    partialCount,
    incorrectCount,
    evidenceSummary,
    missedConcepts: missedConcepts.slice(0, 3),
    citations: Array.from(citationMap.values()),
    recommendedAction,
  };
}

/**
 * Generates the complete Subject Gap Diagnosis Report.
 * Queries actual persisted responses and recalculates topic mastery records in database.
 */
export async function generateGapDiagnosisReport(params: {
  userId: string;
  subjectId: string;
}): Promise<GapDiagnosisReport> {
  const { userId, subjectId } = params;

  // Demo user fast path: return rich deterministic demo gap report ONLY for explicitly designated demo user
  if (userId === "00000000-0000-0000-0000-000000000001" || userId.startsWith("00000000-demo")) {
    const reportTopics = SAMPLE_TOPICS.map((topic) => {
      const mastery = SAMPLE_TOPIC_MASTERY.find((m) => m.topic_id === topic.id) || {
        id: `mastery-${topic.id}`,
        user_id: userId,
        subject_id: subjectId,
        topic_id: topic.id,
        mastery_score: null,
        status: "insufficient_data" as TopicStatus,
        confidence: "low" as ConfidenceLevel,
        assessed_question_count: 0,
        evidence_summary: "No diagnostic attempts submitted yet.",
        last_assessed_at: null,
        updated_at: new Date().toISOString(),
      };

      return {
        topic,
        mastery,
        breakdown: {
          correct: mastery.status === "strong" ? 4 : mastery.status === "medium" ? 2 : 1,
          partial: mastery.status === "medium" ? 1 : 0,
          incorrect: mastery.status === "weak" ? 4 : 0,
        },
        missed_concepts:
          mastery.status === "weak"
            ? ["Regularization penalties (L1 Lasso vs L2 Ridge)", "Feature sparsity conditions"]
            : [],
        citations: [
          {
            document_id: "doc-002",
            document_name: "Professor_Lecture_Notes_Modules_1_to_3.pdf",
            chunk_id: "chunk-101",
            page_number: 8,
            section_title: topic.name,
            quote_snippet: "Primary source evidence for this topic.",
          },
        ],
        recommended_action:
          mastery.status === "weak"
            ? "Immediate revision required on core mathematical formulations."
            : mastery.status === "medium"
            ? "Targeted practice on edge cases."
            : "Strong retention. Maintain with spaced review.",
      };
    });

    const assessedOnly = reportTopics.filter((t) => t.mastery.mastery_score !== null);
    const overallScore =
      assessedOnly.length > 0
        ? Math.round(
            assessedOnly.reduce((sum, t) => sum + (t.mastery.mastery_score || 0), 0) /
              assessedOnly.length
          )
        : null;

    return {
      subject_id: SAMPLE_SUBJECT.id,
      subject_name: SAMPLE_SUBJECT.name,
      overall_mastery: overallScore,
      assessed_topics_count: assessedOnly.length,
      total_topics_count: SAMPLE_TOPICS.length,
      weak_count: reportTopics.filter((t) => t.mastery.status === "weak").length,
      medium_count: reportTopics.filter((t) => t.mastery.status === "medium").length,
      strong_count: reportTopics.filter((t) => t.mastery.status === "strong").length,
      insufficient_data_count: reportTopics.filter((t) => t.mastery.status === "insufficient_data").length,
      topics: reportTopics,
    };
  }

  // Real Database Flow: Strictly scoped to authenticated user and verified subject
  const supabase = createAdminClient();

  // 1. Fetch Subject ensuring ownership
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!subject) {
    return {
      subject_id: subjectId,
      subject_name: "No Subject",
      overall_mastery: null,
      assessed_topics_count: 0,
      total_topics_count: 0,
      weak_count: 0,
      medium_count: 0,
      strong_count: 0,
      insufficient_data_count: 0,
      topics: [],
    };
  }

  // 2. Fetch all Topics for subject
  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  const allTopics: Topic[] = topics || [];

  // 3. Fetch completed quiz attempts and submitted responses
  const { data: responsesData } = await supabase
    .from("responses")
    .select(`
      id, attempt_id, question_id, awarded_marks, maximum_marks, is_correct, feedback,
      quiz_attempts!inner(id, subject_id, status, submitted_at),
      questions!inner(id, topic_id, difficulty, marks, source_references)
    `)
    .eq("user_id", userId)
    .eq("quiz_attempts.subject_id", subjectId)
    .eq("quiz_attempts.status", "evaluated");

  // Group responses by topic_id
  const topicResponsesMap = new Map<string, AssessedQuestionRecord[]>();

  for (const row of responsesData || []) {
    const q = (row as any).questions;
    const attempt = (row as any).quiz_attempts;
    if (!q?.topic_id) continue;

    const list = topicResponsesMap.get(q.topic_id) || [];
    list.push({
      questionId: row.question_id,
      topicId: q.topic_id,
      difficulty: q.difficulty || "medium",
      awardedMarks: Number(row.awarded_marks) || 0,
      maximumMarks: Number(row.maximum_marks) || 1,
      isCorrect: row.is_correct,
      feedback: row.feedback,
      attemptId: attempt.id,
      submittedAt: attempt.submitted_at || new Date().toISOString(),
      sourceReferences: q.source_references || [],
    });
    topicResponsesMap.set(q.topic_id, list);
  }

  // 4. Calculate deterministic mastery for each topic and upsert into topic_mastery table
  const reportTopics = [];

  for (const topic of allTopics) {
    const records = topicResponsesMap.get(topic.id) || [];
    const calc = calculateTopicMastery(topic.id, records);

    // Upsert into topic_mastery table
    const { data: savedMastery } = await supabase
      .from("topic_mastery")
      .upsert(
        {
          user_id: userId,
          subject_id: subjectId,
          topic_id: topic.id,
          mastery_score: calc.masteryScore,
          status: calc.status,
          confidence: calc.confidence,
          assessed_question_count: calc.questionCount,
          evidence_summary: calc.evidenceSummary,
          last_assessed_at: calc.questionCount > 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" }
      )
      .select()
      .single();

    const masteryObj: TopicMastery = savedMastery || {
      id: `mastery-${topic.id}`,
      user_id: userId,
      subject_id: subjectId,
      topic_id: topic.id,
      mastery_score: calc.masteryScore,
      status: calc.status,
      confidence: calc.confidence,
      assessed_question_count: calc.questionCount,
      evidence_summary: calc.evidenceSummary,
      last_assessed_at: calc.questionCount > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    reportTopics.push({
      topic,
      mastery: masteryObj,
      breakdown: {
        correct: calc.correctCount,
        partial: calc.partialCount,
        incorrect: calc.incorrectCount,
      },
      missed_concepts: calc.missedConcepts,
      citations: calc.citations,
      recommended_action: calc.recommendedAction,
    });
  }

  const assessed = reportTopics.filter((t) => t.mastery.mastery_score !== null);
  const overallMastery =
    assessed.length > 0
      ? Math.round(
          assessed.reduce((acc, t) => acc + (t.mastery.mastery_score || 0), 0) / assessed.length
        )
      : null;

  return {
    subject_id: subjectId,
    subject_name: subject?.name || "Subject",
    overall_mastery: overallMastery,
    assessed_topics_count: assessed.length,
    total_topics_count: allTopics.length,
    weak_count: reportTopics.filter((t) => t.mastery.status === "weak").length,
    medium_count: reportTopics.filter((t) => t.mastery.status === "medium").length,
    strong_count: reportTopics.filter((t) => t.mastery.status === "strong").length,
    insufficient_data_count: reportTopics.filter((t) => t.mastery.status === "insufficient_data").length,
    topics: reportTopics,
  };
}
