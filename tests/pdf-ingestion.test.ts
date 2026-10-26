import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { extractTextFromBuffer, cleanText } from "@/lib/ai/ingestion";

describe("PDF and Document Text Ingestion Engine", () => {
  it("should extract text successfully from a normal valid PDF without DOMMatrix errors", async () => {
    const samplePdfPath = path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "test",
      "data",
      "01-valid.pdf"
    );

    expect(fs.existsSync(samplePdfPath)).toBe(true);

    const pdfBuffer = fs.readFileSync(samplePdfPath);
    const result = await extractTextFromBuffer(pdfBuffer, "application/pdf", "01-valid.pdf");

    expect(result.error).toBeUndefined();
    expect(result.isScannedOrEmpty).toBe(false);
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.text).toContain("Trace-based Just-in-Time Type Specialization");
    expect(result.pages.length).toBeGreaterThan(0);
  });

  it("should cleanly extract text from a plain text document (.txt)", async () => {
    const txtContent = "Introduction to Database Systems\n\nRelational algebra, SQL, normal forms, and ACID properties.";
    const buffer = Buffer.from(txtContent, "utf-8");

    const result = await extractTextFromBuffer(buffer, "text/plain", "syllabus.txt");

    expect(result.error).toBeUndefined();
    expect(result.isScannedOrEmpty).toBe(false);
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Introduction to Database Systems");
  });

  it("should reject an empty 0-byte buffer with an explicit error", async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await extractTextFromBuffer(emptyBuffer, "application/pdf", "empty.pdf");

    expect(result.isScannedOrEmpty).toBe(true);
    expect(result.error).toContain("empty (0 bytes)");
  });

  it("should handle corrupted or invalid PDF structures gracefully", async () => {
    const corruptedBuffer = Buffer.from("NOT_A_REAL_PDF_STREAM_CORRUPT_BYTES_XYZ");
    const result = await extractTextFromBuffer(corruptedBuffer, "application/pdf", "corrupt.pdf");

    expect(result.isScannedOrEmpty).toBe(true);
    expect(result.text).toBe("");
    expect(result.error).toContain("Invalid or corrupted PDF file");
  });

  it("should flag invalid PDF with broken object tables", async () => {
    const invalidPdfPath = path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "test",
      "data",
      "03-invalid.pdf"
    );

    if (fs.existsSync(invalidPdfPath)) {
      const invalidBuffer = fs.readFileSync(invalidPdfPath);
      const result = await extractTextFromBuffer(invalidBuffer, "application/pdf", "03-invalid.pdf");

      expect(result.isScannedOrEmpty).toBe(true);
      expect(result.error).toMatch(/Invalid or corrupted PDF file|Could not parse PDF/);
    }
  });

  it("should normalize and clean excessive whitespace and null bytes", () => {
    const dirty = "Machine\0 Learning  \t   Module\r\n\r\n\r\n\r\nLinear Regression  ";
    const cleaned = cleanText(dirty);

    expect(cleaned).toBe("Machine Learning Module\n\nLinear Regression");
  });
});
