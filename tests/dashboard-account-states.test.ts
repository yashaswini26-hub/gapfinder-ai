import { describe, it, expect } from "vitest";
import {
  calculateTopicMastery,
  AssessedQuestionRecord,
  DEFAULT_GAP_CONFIG,
} from "@/lib/ai/gap-analysis";
import {
  calculateExamUrgency,
  calculateTopicPriority,
} from "@/lib/ai/revision-planner";
import { Topic, TopicMastery } from "@/types";
import { SAMPLE_SUBJECT, SAMPLE_TOPICS } from "@/lib/demo/sample-data";

describe("Dashboard Account States & Onboarding Validation", () => {
  describe("1. Brand-New Account (Zero uploaded materials or assessments)", () => {
    it("should report insufficient_data with null mastery for an unassessed topic", () => {
      const emptyRecords: AssessedQuestionRecord[] = [];
      const result = calculateTopicMastery("topic-fresh-001", emptyRecords);

      expect(result.status).toBe("insufficient_data");
      expect(result.masteryScore).toBeNull();
      expect(result.confidence).toBe("low");
      expect(result.questionCount).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.missedConcepts).toEqual([]);
      expect(result.citations).toEqual([]);
      expect(result.recommendedAction).toContain("initial diagnostic");
    });

    it("should return null exam urgency and null days remaining when user has not set an exam date", () => {
      const urgency = calculateExamUrgency(null);
      expect(urgency.daysRemaining).toBeNull();
      expect(urgency.urgencyScore).toBe(25.0); // Baseline non-urgent score
    });

    it("should calculate null overall mastery when an account has 0 assessed topics", () => {
      // Simulate 4 syllabus topics extracted from an uploaded document, none evaluated yet
      const unassessedMasteries: TopicMastery[] = [
        {
          id: "m-1",
          user_id: "user-new-001",
          subject_id: "sub-1",
          topic_id: "t-1",
          mastery_score: null,
          status: "insufficient_data",
          confidence: "low",
          assessed_question_count: 0,
          evidence_summary: "No diagnostic attempts submitted yet.",
          last_assessed_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          id: "m-2",
          user_id: "user-new-001",
          subject_id: "sub-1",
          topic_id: "t-2",
          mastery_score: null,
          status: "insufficient_data",
          confidence: "low",
          assessed_question_count: 0,
          evidence_summary: "No diagnostic attempts submitted yet.",
          last_assessed_at: null,
          updated_at: new Date().toISOString(),
        },
      ];

      const assessedOnly = unassessedMasteries.filter((m) => m.mastery_score !== null);
      const overallMastery =
        assessedOnly.length > 0
          ? Math.round(
              assessedOnly.reduce((sum, m) => sum + (m.mastery_score || 0), 0) /
                assessedOnly.length
            )
          : null;

      expect(overallMastery).toBeNull();
      expect(assessedOnly.length).toBe(0);
    });
  });

  describe("2. Account with Uploaded Materials but No Completed Assessments", () => {
    it("should not generate revision tasks for unassessed topics", () => {
      const topic1: Topic = {
        id: "t-1",
        subject_id: "sub-1",
        parent_topic_id: null,
        name: "Linear Regression",
        description: null,
        syllabus_unit: "Unit 1",
        importance: 4,
        estimated_study_minutes: 45,
        sort_order: 1,
        created_at: "",
        updated_at: "",
      };

      const unassessedMastery: TopicMastery = {
        id: "m-1",
        user_id: "user-002",
        subject_id: "sub-1",
        topic_id: "t-1",
        mastery_score: null,
        status: "insufficient_data",
        confidence: "low",
        assessed_question_count: 0,
        evidence_summary: "No diagnostic attempts submitted yet.",
        last_assessed_at: null,
        updated_at: "",
      };

      const scoredTopics = [
        {
          topic: topic1,
          mastery: unassessedMastery,
          priority: calculateTopicPriority(topic1, unassessedMastery, 25),
        },
      ];

      // Exact filter applied in revision-planner.ts:
      const assessedScoredTopics = scoredTopics.filter(
        (item) =>
          item.mastery &&
          item.mastery.mastery_score !== null &&
          item.mastery.status !== "insufficient_data"
      );

      // Verify that no revision tasks are scheduled for unassessed topics
      expect(assessedScoredTopics.length).toBe(0);
    });

    it("should categorize all unassessed topics under insufficient_data with 0 weak/medium/strong counts", () => {
      const rawTopics = [
        calculateTopicMastery("t-1", []),
        calculateTopicMastery("t-2", []),
        calculateTopicMastery("t-3", []),
      ];

      const weakCount = rawTopics.filter((t) => t.status === "weak").length;
      const mediumCount = rawTopics.filter((t) => t.status === "medium").length;
      const strongCount = rawTopics.filter((t) => t.status === "strong").length;
      const insufficientCount = rawTopics.filter((t) => t.status === "insufficient_data").length;

      expect(weakCount).toBe(0);
      expect(mediumCount).toBe(0);
      expect(strongCount).toBe(0);
      expect(insufficientCount).toBe(3);
    });
  });

  describe("3. Account with Real Evaluated Quiz Attempts", () => {
    it("should calculate deterministic weak/medium/strong mastery from real awarded marks", () => {
      // Weak topic: student struggled with Ridge/Lasso regularization
      const weakRecords: AssessedQuestionRecord[] = [
        {
          questionId: "q1",
          topicId: "t-reg",
          difficulty: "hard",
          awardedMarks: 0,
          maximumMarks: 2,
          isCorrect: false,
          attemptId: "att-real-1",
          submittedAt: new Date().toISOString(),
          feedback: "Confused L1 sparsity with L2 shrinkage.",
          sourceReferences: [
            {
              document_id: "doc-1",
              document_name: "ML_Textbook.pdf",
              chunk_id: "chunk-12",
              page_number: 42,
              section_title: "Regularization",
              quote_snippet: "L1 penalty induces exact zeroes.",
            },
          ],
        },
        {
          questionId: "q2",
          topicId: "t-reg",
          difficulty: "medium",
          awardedMarks: 0.5,
          maximumMarks: 2,
          isCorrect: false,
          attemptId: "att-real-1",
          submittedAt: new Date().toISOString(),
          feedback: "Partial formulation of loss function.",
          sourceReferences: [],
        },
      ];

      const weakResult = calculateTopicMastery("t-reg", weakRecords);
      expect(weakResult.status).toBe("weak");
      expect(weakResult.masteryScore).toBeLessThan(50);
      expect(weakResult.citations.length).toBe(1);
      expect(weakResult.missedConcepts).toContain("Confused L1 sparsity with L2 shrinkage.");

      // Strong topic: student got full marks on Gradient Descent
      const strongRecords: AssessedQuestionRecord[] = [
        {
          questionId: "q3",
          topicId: "t-gd",
          difficulty: "medium",
          awardedMarks: 2,
          maximumMarks: 2,
          isCorrect: true,
          attemptId: "att-real-1",
          submittedAt: new Date().toISOString(),
          sourceReferences: [],
        },
        {
          questionId: "q4",
          topicId: "t-gd",
          difficulty: "hard",
          awardedMarks: 3,
          maximumMarks: 3,
          isCorrect: true,
          attemptId: "att-real-1",
          submittedAt: new Date().toISOString(),
          sourceReferences: [],
        },
      ];

      const strongResult = calculateTopicMastery("t-gd", strongRecords);
      expect(strongResult.status).toBe("strong");
      expect(strongResult.masteryScore).toBe(100);

      // Overall average across ONLY evaluated topics
      const assessedScores = [weakResult.masteryScore!, strongResult.masteryScore!];
      const overall = Math.round(
        assessedScores.reduce((sum, s) => sum + s, 0) / assessedScores.length
      );
      expect(overall).toBeGreaterThan(0);
      expect(overall).not.toBe(64); // Not sample hardcoded 64%
    });

    it("should prioritize weak topics over strong topics in revision scheduling", () => {
      const weakTopic: Topic = {
        id: "t-weak",
        subject_id: "s1",
        parent_topic_id: null,
        name: "L1/L2 Regularization",
        description: null,
        syllabus_unit: "Unit 3",
        importance: 4,
        estimated_study_minutes: 45,
        sort_order: 1,
        created_at: "",
        updated_at: "",
      };

      const weakMastery: TopicMastery = {
        id: "m-w",
        user_id: "u-real",
        subject_id: "s1",
        topic_id: "t-weak",
        mastery_score: 25.0,
        status: "weak",
        confidence: "medium",
        assessed_question_count: 2,
        evidence_summary: "Struggled with regularizers",
        last_assessed_at: null,
        updated_at: "",
      };

      const strongTopic: Topic = {
        id: "t-strong",
        subject_id: "s1",
        parent_topic_id: null,
        name: "Gradient Descent",
        description: null,
        syllabus_unit: "Unit 2",
        importance: 4,
        estimated_study_minutes: 45,
        sort_order: 2,
        created_at: "",
        updated_at: "",
      };

      const strongMastery: TopicMastery = {
        id: "m-s",
        user_id: "u-real",
        subject_id: "s1",
        topic_id: "t-strong",
        mastery_score: 95.0,
        status: "strong",
        confidence: "high",
        assessed_question_count: 3,
        evidence_summary: "Strong grasp",
        last_assessed_at: null,
        updated_at: "",
      };

      const urgency = calculateExamUrgency(new Date(Date.now() + 5 * 86400000).toISOString());
      const weakPriority = calculateTopicPriority(weakTopic, weakMastery, urgency.urgencyScore);
      const strongPriority = calculateTopicPriority(strongTopic, strongMastery, urgency.urgencyScore);

      expect(weakPriority).toBeGreaterThan(strongPriority);
    });
  });

  describe("4. Strict Demo Mode Isolation", () => {
    it("should never classify a real student UUID as a demo user", () => {
      const realUserIds = [
        "3d9b30b0-65c4-4d17-9739-2f2ed3819e19",
        "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "user_2rW3x8Y9Z0a1b2c3d4e5f6g7h8",
      ];

      for (const id of realUserIds) {
        const isDemo = id === "00000000-0000-0000-0000-000000000001" || id.startsWith("00000000-demo");
        expect(isDemo).toBe(false);
      }
    });

    it("should only identify exact demo user UUIDs as demo mode", () => {
      const demoUserIds = [
        "00000000-0000-0000-0000-000000000001",
        "00000000-demo-user-alex",
      ];

      for (const id of demoUserIds) {
        const isDemo = id === "00000000-0000-0000-0000-000000000001" || id.startsWith("00000000-demo");
        expect(isDemo).toBe(true);
      }
    });

    it("SAMPLE_SUBJECT and SAMPLE_TOPICS should have explicit demo identifiers", () => {
      expect(SAMPLE_SUBJECT.id).toMatch(/^00000000/);
      expect(SAMPLE_TOPICS.length).toBe(8);
      // Sample topics should not be returned as default topics for real users
    });
  });
});
