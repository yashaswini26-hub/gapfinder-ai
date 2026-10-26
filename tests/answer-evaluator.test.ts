import { describe, it, expect } from "vitest";
import { evaluateObjectiveAnswer, normalizeAnswer } from "@/lib/ai/answer-evaluator";

describe("Answer Evaluator", () => {
  it("should normalize answers correctly", () => {
    expect(normalizeAnswer("  Lasso Regression! ")).toBe("lasso regression");
    expect(normalizeAnswer("Ordinary Least Squares (OLS)")).toBe("ordinary least squares ols");
  });

  it("should evaluate single choice string match correctly", () => {
    const res = evaluateObjectiveAnswer(
      "Lasso Regression (L1 penalty)",
      "Lasso Regression (L1 penalty)",
      2
    );
    expect(res.isCorrect).toBe(true);
    expect(res.awardedMarks).toBe(2);
  });

  it("should reject incorrect options", () => {
    const res = evaluateObjectiveAnswer(
      "Ridge Regression (L2 penalty)",
      "Lasso Regression (L1 penalty)",
      2
    );
    expect(res.isCorrect).toBe(false);
    expect(res.awardedMarks).toBe(0);
    expect(res.feedback).toContain("The correct answer is");
  });

  it("should evaluate true/false boolean matching", () => {
    const trueMatch = evaluateObjectiveAnswer(true, true, 1);
    expect(trueMatch.isCorrect).toBe(true);
    expect(trueMatch.awardedMarks).toBe(1);

    const falseMismatch = evaluateObjectiveAnswer("false", true, 1);
    expect(falseMismatch.isCorrect).toBe(false);
    expect(falseMismatch.awardedMarks).toBe(0);
  });

  it("should award zero marks for null or empty answers", () => {
    const res = evaluateObjectiveAnswer(null, "Expected Option", 2);
    expect(res.isCorrect).toBe(false);
    expect(res.awardedMarks).toBe(0);
    expect(res.feedback).toContain("No answer was provided");
  });
});
