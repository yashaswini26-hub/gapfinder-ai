import { describe, it, expect } from "vitest";
import { chunkDocument } from "@/lib/ai/chunking";

describe("Document Chunker", () => {
  it("should split text and detect section headings", () => {
    const sampleText = `Section 1.1: Foundations of Statistics
This is a comprehensive introduction to statistical principles used in machine learning.
Random variables describe events in mathematical terms.

Section 1.2: Hypothesis Testing
Hypothesis tests establish whether an observed effect is statistically significant or attributable to chance.
The null hypothesis typically states there is no effect.`;

    const chunks = chunkDocument(sampleText, { targetTokens: 50, overlapTokens: 10, minChunkTokens: 5 });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
    // Heading should be detected
    const detectedHeadings = chunks.map((c) => c.sectionTitle).filter(Boolean);
    expect(detectedHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("should preserve page numbers across multi-page document input", () => {
    const pages = [
      { pageNumber: 1, text: "Chapter 1: Data Structures\n\nArrays provide contiguous memory storage." },
      { pageNumber: 2, text: "Chapter 2: Algorithms\n\nBinary search runs in logarithmic time O(log n)." },
    ];

    const chunks = chunkDocument(pages, { minChunkTokens: 5 });
    expect(chunks.length).toBe(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);
  });
});
