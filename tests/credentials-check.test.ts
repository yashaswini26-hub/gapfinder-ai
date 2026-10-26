import { describe, it, expect } from "vitest";
import { generateEmbedding, VECTOR_DIMENSION } from "@/lib/ai/embeddings";
import { extractJsonFromText } from "@/lib/ai/provider";

describe("Environment & RAG Pipeline Configuration", () => {
  it("verifies vector dimensions constant matches pgvector schema (768)", () => {
    expect(VECTOR_DIMENSION).toBe(768);
  });

  it("handles markdown code fence JSON extraction reliably", () => {
    const rawFenced = "```json\n{\"score\": 85, \"status\": \"strong\"}\n```";
    const extracted = extractJsonFromText(rawFenced) as any;
    expect(extracted.score).toBe(85);
    expect(extracted.status).toBe("strong");

    const plainJson = "{\"score\": 42, \"status\": \"weak\"}";
    const extractedPlain = extractJsonFromText(plainJson) as any;
    expect(extractedPlain.score).toBe(42);
    expect(extractedPlain.status).toBe("weak");
  });

  it("safely handles embedding generation with outputDimensionality", async () => {
    // If Gemini key is configured, test embedding generation produces 768 dimensions
    if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("placeholder")) {
      const embedding = await generateEmbedding("Linear Regression and Gradient Descent");
      if (embedding) {
        expect(embedding.length).toBe(768);
      }
    }
  });
});
