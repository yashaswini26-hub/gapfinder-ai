import { z } from "zod";

// ==========================================
// Authentication & User Schemas
// ==========================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  onboardingCompleted: z.boolean().optional(),
});

// ==========================================
// Subject & Preferences Schemas
// ==========================================

export const subjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  examDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid exam date format",
    }),
  dailyStudyMinutes: z
    .number()
    .int()
    .min(15, "Minimum 15 minutes per day")
    .max(720, "Maximum 12 hours per day")
    .default(60),
});

// ==========================================
// Document Upload & Ingestion Schemas
// ==========================================

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const documentUploadSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: "Only PDF and TXT files are currently supported",
  }),
  fileSize: z.number().max(MAX_FILE_SIZE_BYTES, "File size exceeds 20MB limit"),
});

// ==========================================
// AI Structured Output Schemas
// ==========================================

export const sourceReferenceSchema = z.object({
  document_id: z.string(),
  document_name: z.string(),
  chunk_id: z.string(),
  page_number: z.number().nullable().optional(),
  section_title: z.string().nullable().optional(),
  quote_snippet: z.string().optional(),
});

// Topic Extraction from Syllabus / Material
export const extractedTopicSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  syllabus_unit: z.string().max(80).optional(),
  importance: z.number().int().min(1).max(5).default(3),
  estimated_study_minutes: z.number().int().min(10).max(300).default(45),
  parent_topic_name: z.string().optional().nullable(),
  evidence_chunk_ids: z.array(z.string()).default([]),
});

export const topicExtractionResponseSchema = z.object({
  topics: z.array(extractedTopicSchema),
});

// Question Generation
export const generatedQuestionSchema = z.object({
  topic_id: z.string(),
  question_type: z.enum(["single_choice", "multiple_choice", "true_false", "short_answer"]),
  question_text: z.string().min(10),
  options: z.array(z.string()).nullable().optional(),
  correct_answer: z.union([z.string(), z.array(z.string()), z.boolean()]),
  explanation: z.string().min(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  marks: z.number().int().min(1).max(10).default(1),
  rubric: z
    .object({
      key_points: z.array(z.string()),
      partial_credit_guidelines: z.string(),
    })
    .nullable()
    .optional(),
  source_references: z.array(sourceReferenceSchema).min(1, "Question must have at least one citation"),
});

export const questionSetResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

// Descriptive Answer Evaluation
export const shortAnswerEvaluationSchema = z.object({
  awarded_marks: z.number().min(0),
  maximum_marks: z.number().min(1),
  is_correct: z.boolean(),
  feedback: z.string().min(5),
  missing_concepts: z.array(z.string()).default([]),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
});

// Topic Assistant Chat
export const assistantMessageSchema = z.object({
  subjectId: z.string().uuid(),
  topicId: z.string().uuid().optional().nullable(),
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional().nullable(),
});

// Quiz Submission
export const quizSubmissionItemSchema = z.object({
  question_id: z.string().uuid(),
  answer: z.union([z.string(), z.array(z.string()), z.boolean(), z.null()]),
});

export const quizSubmissionSchema = z.object({
  attempt_id: z.string().uuid(),
  responses: z.array(quizSubmissionItemSchema),
});

// Diagnostic Quiz Setup
export const diagnosticSetupSchema = z.object({
  subjectId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).optional(),
  questionCount: z.number().int().min(3).max(30).default(10),
  timeMinutes: z.number().int().min(5).max(120).default(20),
});

// Revision Task Status Update
export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "completed", "skipped"]),
  completionNotes: z.string().max(500).optional().nullable(),
});
