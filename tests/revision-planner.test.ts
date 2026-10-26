import { describe, it, expect } from "vitest";
import {
  calculateExamUrgency,
  calculateTopicPriority,
} from "@/lib/ai/revision-planner";
import { Topic, TopicMastery } from "@/types";

describe("Adaptive Revision Planner", () => {
  it("should calculate exam urgency based on days remaining", () => {
    // Exam in 2 days -> Urgency 100
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateExamUrgency(inTwoDays).urgencyScore).toBe(100.0);

    // Exam in 6 days -> Urgency 85
    const inSixDays = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateExamUrgency(inSixDays).urgencyScore).toBe(85.0);

    // Exam in 12 days -> Urgency 65
    const inTwelveDays = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateExamUrgency(inTwelveDays).urgencyScore).toBe(65.0);

    // No exam date -> Conservative default 25
    expect(calculateExamUrgency(null).urgencyScore).toBe(25.0);
  });

  it("should assign higher revision priority to weak topics with high importance", () => {
    const weakHighImportanceTopic: Topic = {
      id: "t1",
      subject_id: "s1",
      parent_topic_id: null,
      name: "Bias-Variance Tradeoff",
      description: null,
      syllabus_unit: "Unit 2",
      importance: 5, // max importance (100)
      estimated_study_minutes: 60,
      sort_order: 1,
      created_at: "",
      updated_at: "",
    };

    const weakMastery: TopicMastery = {
      id: "m1",
      user_id: "u1",
      subject_id: "s1",
      topic_id: "t1",
      mastery_score: 30.0, // Weak: weakness = 70.0
      status: "weak",
      confidence: "high",
      assessed_question_count: 5,
      evidence_summary: "",
      last_assessed_at: null,
      updated_at: "",
    };

    const strongLowImportanceTopic: Topic = {
      id: "t2",
      subject_id: "s1",
      parent_topic_id: null,
      name: "Minor Definition",
      description: null,
      syllabus_unit: "Unit 1",
      importance: 1, // min importance (20)
      estimated_study_minutes: 20,
      sort_order: 2,
      created_at: "",
      updated_at: "",
    };

    const strongMastery: TopicMastery = {
      id: "m2",
      user_id: "u1",
      subject_id: "s1",
      topic_id: "t2",
      mastery_score: 90.0, // Strong: weakness = 10.0
      status: "strong",
      confidence: "high",
      assessed_question_count: 5,
      evidence_summary: "",
      last_assessed_at: null,
      updated_at: "",
    };

    const urgency = 65.0; // Exam in 12 days
    const priority1 = calculateTopicPriority(weakHighImportanceTopic, weakMastery, urgency);
    const priority2 = calculateTopicPriority(strongLowImportanceTopic, strongMastery, urgency);

    // Priority 1 should be significantly higher than Priority 2
    expect(priority1).toBeGreaterThan(priority2);
    // priority1 = 0.50 * 70 + 0.30 * 100 + 0.20 * 65 = 35 + 30 + 13 = 78.0
    expect(priority1).toBe(78.0);
    // priority2 = 0.50 * 10 + 0.30 * 20 + 0.20 * 65 = 5 + 6 + 13 = 24.0
    expect(priority2).toBe(24.0);
  });
});
