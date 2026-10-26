// ==========================================
// GapFinder AI - Domain Type Definitions
// ==========================================

export type TopicStatus = "insufficient_data" | "weak" | "medium" | "strong";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DocumentStatus = "uploaded" | "processing" | "processed" | "failed";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "short_answer";
export type QuizStatus = "in_progress" | "submitted" | "evaluated";
export type TaskStatus = "pending" | "completed" | "skipped";

export interface UserProfile {
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exam_date: string | null;
  daily_study_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  subject_id: string | null;
  filename: string;
  mime_type: string;
  storage_path: string;
  file_size: number;
  status: DocumentStatus;
  processing_error: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  section_title: string | null;
  token_count: number | null;
  embedding?: number[];
  created_at: string;
  // Included in search results
  similarity?: number;
  filename?: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  description: string | null;
  syllabus_unit: string | null;
  importance: number; // 1 to 5
  estimated_study_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Enriched
  source_chunk_count?: number;
  mastery?: TopicMastery;
  children?: Topic[];
}

export interface TopicSource {
  topic_id: string;
  chunk_id: string;
  relationship_notes?: string | null;
}

export interface SourceReference {
  document_id: string;
  document_name: string;
  chunk_id: string;
  page_number: number | null;
  section_title: string | null;
  quote_snippet?: string;
}

export interface QuestionPublic {
  id: string;
  attempt_id: string;
  topic_id: string;
  question_type: QuestionType;
  question_text: string;
  options: string[] | null;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  source_references: SourceReference[];
}

export interface QuestionPrivate extends QuestionPublic {
  correct_answer: string | string[] | boolean;
  explanation: string;
  rubric: {
    key_points: string[];
    partial_credit_guidelines: string;
  } | null;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  subject_id: string;
  quiz_type: string;
  status: QuizStatus;
  total_score: number | null;
  total_possible: number | null;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
  questions?: QuestionPublic[];
  responses?: QuestionResponse[];
}

export interface QuestionResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  user_id: string;
  answer: string | string[] | boolean | null;
  awarded_marks: number | null;
  maximum_marks: number;
  is_correct: boolean | null;
  feedback: string | null;
  created_at: string;
}

export interface TopicMastery {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  mastery_score: number | null; // 0 - 100
  status: TopicStatus;
  confidence: ConfidenceLevel;
  assessed_question_count: number;
  evidence_summary: string;
  last_assessed_at: string | null;
  updated_at: string;
  topic_name?: string;
  unit_name?: string;
}

export interface RevisionTask {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  title: string;
  description: string;
  priority_score: number;
  scheduled_date: string;
  duration_minutes: number;
  status: TaskStatus;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
  topic?: Topic;
}

export interface ChatSession {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: "user" | "assistant";
  content: string;
  citations: SourceReference[];
  created_at: string;
}

export interface GapDiagnosisReport {
  subject_id: string;
  subject_name: string;
  overall_mastery: number | null;
  assessed_topics_count: number;
  total_topics_count: number;
  weak_count: number;
  medium_count: number;
  strong_count: number;
  insufficient_data_count: number;
  topics: {
    topic: Topic;
    mastery: TopicMastery;
    breakdown: {
      correct: number;
      partial: number;
      incorrect: number;
    };
    missed_concepts: string[];
    citations: SourceReference[];
    recommended_action: string;
  }[];
}

export interface RevisionPlanSummary {
  subject_id: string;
  exam_date: string | null;
  days_remaining: number | null;
  daily_study_minutes: number;
  total_scheduled_minutes: number;
  tasks_by_date: Record<string, RevisionTask[]>;
  pending_tasks_count: number;
  completed_tasks_count: number;
}
