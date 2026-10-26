import { describe, it, expect } from "vitest";
import {
  calculateTopicMastery,
  DEFAULT_GAP_CONFIG,
  AssessedQuestionRecord,
} from "@/lib/ai/gap-analysis";

describe("Deterministic Gap Analysis Engine", () => {
  it("should handle empty assessment data gracefully (insufficient_data)", () => {
    const result = calculateTopicMastery("topic-1", []);
    expect(result.status).toBe("insufficient_data");
    expect(result.masteryScore).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.questionCount).toBe(0);
    expect(result.recommendedAction).toContain("initial diagnostic");
  });

  it("should classify mastery below 50% as weak", () => {
    const records: AssessedQuestionRecord[] = [
      {
        questionId: "q1",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 0,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q2",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 0.5,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q3",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 0,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
    ];

    const result = calculateTopicMastery("topic-1", records);
    expect(result.status).toBe("weak");
    expect(result.masteryScore).toBeLessThan(50);
    expect(result.confidence).toBe("medium"); // 3 questions = medium confidence
    expect(result.incorrectCount).toBeGreaterThanOrEqual(2);
  });

  it("should classify score between 50% and 79.99% as medium", () => {
    const records: AssessedQuestionRecord[] = [
      {
        questionId: "q1",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 2,
        maximumMarks: 2,
        isCorrect: true,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q2",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 1,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q3",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 1,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q4",
        topicId: "topic-1",
        difficulty: "medium",
        awardedMarks: 2,
        maximumMarks: 2,
        isCorrect: true,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
    ];

    const result = calculateTopicMastery("topic-1", records);
    expect(result.status).toBe("medium");
    expect(result.masteryScore).toBeGreaterThanOrEqual(50);
    expect(result.masteryScore).toBeLessThan(80);
    expect(result.confidence).toBe("medium"); // 4 questions
  });

  it("should classify score >= 80% as strong with high confidence if >= 6 questions", () => {
    const records: AssessedQuestionRecord[] = Array.from({ length: 6 }).map((_, i) => ({
      questionId: `q-${i}`,
      topicId: "topic-1",
      difficulty: "medium",
      awardedMarks: 2,
      maximumMarks: 2,
      isCorrect: true,
      attemptId: "att-1",
      submittedAt: new Date().toISOString(),
      sourceReferences: [],
    }));

    const result = calculateTopicMastery("topic-1", records);
    expect(result.status).toBe("strong");
    expect(result.masteryScore).toBe(100);
    expect(result.confidence).toBe("high"); // 6 questions = high confidence
  });

  it("should weight hard questions higher than easy questions", () => {
    // Student answered an easy question wrong (0/2) and a hard question right (2/2)
    const records: AssessedQuestionRecord[] = [
      {
        questionId: "q-easy",
        topicId: "topic-1",
        difficulty: "easy", // weight: 1.0
        awardedMarks: 0,
        maximumMarks: 2,
        isCorrect: false,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
      {
        questionId: "q-hard",
        topicId: "topic-1",
        difficulty: "hard", // weight: 1.5
        awardedMarks: 2,
        maximumMarks: 2,
        isCorrect: true,
        attemptId: "att-1",
        submittedAt: new Date().toISOString(),
        sourceReferences: [],
      },
    ];

    const result = calculateTopicMastery("topic-1", records);
    // Weighted earned: 0 * 1.0 + 2 * 1.5 = 3.0
    // Weighted possible: 2 * 1.0 + 2 * 1.5 = 5.0
    // Expected score: (3.0 / 5.0) * 100 = 60.0%
    expect(result.masteryScore).toBe(60.0);
    expect(result.status).toBe("medium");
  });
});
