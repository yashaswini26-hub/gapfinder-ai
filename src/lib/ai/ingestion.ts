import { chunkDocument, RawChunk } from "./chunking";
import { generateBatchEmbeddings } from "./embeddings";
import { createAdminClient } from "@/lib/supabase/server";

export interface ExtractionResult {
  text: string;
  pageCount: number;
  pages: { pageNumber: number; text: string }[];
  isScannedOrEmpty: boolean;
  error?: string;
}

/**
 * Normalizes text, removes null bytes, normalizes excessive whitespace.
 */
export function cleanText(input: string): string {
  return input
    .replace(/\0/g, "") // remove null characters
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Server-side text extraction from PDF or TXT buffer.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractionResult> {
  if (mimeType === "text/plain" || filename.endsWith(".txt")) {
    const rawText = buffer.toString("utf-8");
    const cleaned = cleanText(rawText);
    if (cleaned.length < 20) {
      return {
        text: cleaned,
        pageCount: 1,
        pages: [{ pageNumber: 1, text: cleaned }],
        isScannedOrEmpty: true,
        error: "Text document is empty or contains insufficient content.",
      };
    }

    return {
      text: cleaned,
      pageCount: 1,
      pages: [{ pageNumber: 1, text: cleaned }],
      isScannedOrEmpty: false,
    };
  }

  if (!buffer || buffer.length === 0) {
    return {
      text: "",
      pageCount: 0,
      pages: [],
      isScannedOrEmpty: true,
      error: "Uploaded document is empty (0 bytes). Please upload a valid file.",
    };
  }

  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    try {
      // Use pure Node.js parser implementation avoiding browser DOM/canvas dependencies
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      let pdfParser;
      try {
        pdfParser = require("pdf-parse/lib/pdf-parse.js");
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        pdfParser = require("pdf-parse");
      }
      const parseFn = typeof pdfParser === "function" ? pdfParser : pdfParser.default;
      const pdfData = await parseFn(buffer);
      const cleaned = cleanText(pdfData.text || "");
      const numPages = pdfData.numpages || 1;

      // Empty PDF detection
      if (cleaned.length === 0) {
        return {
          text: "",
          pageCount: numPages,
          pages: [],
          isScannedOrEmpty: true,
          error: "Empty PDF document detected. No readable text could be found.",
        };
      }

      // Scanned/image-only PDF detection: less than 50 chars for multi-page or 20 for single-page
      if (cleaned.length < (numPages > 1 ? 50 : 20)) {
        return {
          text: cleaned,
          pageCount: numPages,
          pages: [],
          isScannedOrEmpty: true,
          error: "Scanned or image-only PDF detected. Please upload a searchable text PDF or notes in TXT format.",
        };
      }

      // Simple heuristic page split (pdf-parse does not always delimit pages cleanly in text)
      const pageStrings = pdfData.text.split(/\f|\n(?=Page \d+)/i);
      const pages = pageStrings.length > 1
        ? pageStrings.map((t: string, idx: number) => ({
            pageNumber: idx + 1,
            text: cleanText(t),
          }))
        : [{ pageNumber: 1, text: cleaned }];

      return {
        text: cleaned,
        pageCount: numPages,
        pages,
        isScannedOrEmpty: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF extraction failed";
      const name = err instanceof Error ? err.name : "";
      const lower = msg.toLowerCase();

      let userError = `Could not parse PDF: ${msg}. Please ensure the file is not password-protected or corrupted.`;

      if (name === "PasswordException" || lower.includes("password") || lower.includes("encrypted")) {
        userError = "Password-protected or encrypted PDF detected. Please remove password protection before uploading.";
      } else if (
        name === "InvalidPDFException" ||
        lower.includes("invalid pdf") ||
        lower.includes("structure") ||
        lower.includes("invalid xref") ||
        lower.includes("corrupted") ||
        lower.includes("corrupt") ||
        lower.includes("top-level pages")
      ) {
        userError = "Invalid or corrupted PDF file. Please ensure the file is a valid, uncorrupted PDF document.";
      }

      return {
        text: "",
        pageCount: 0,
        pages: [],
        isScannedOrEmpty: true,
        error: userError,
      };
    }
  }

  return {
    text: "",
    pageCount: 0,
    pages: [],
    isScannedOrEmpty: true,
    error: `Unsupported MIME type: ${mimeType}. Please upload PDF or TXT files.`,
  };
}

/**
 * Full Ingestion Pipeline for an uploaded document:
 * 1. Read document from storage
 * 2. Extract text & detect scanned PDF
 * 3. Chunk into overlapping segments with metadata
 * 4. Generate vector embeddings
 * 5. Idempotently store chunks in pgvector
 * 6. Update document status
 */
export async function processDocumentIngestion(
  documentId: string,
  userId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ success: boolean; chunksCount: number; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Update status to processing
    await supabase
      .from("documents")
      .update({ status: "processing", processing_error: null })
      .eq("id", documentId)
      .eq("user_id", userId);

    // 1. Extract text
    const extraction = await extractTextFromBuffer(buffer, mimeType, filename);
    if (extraction.isScannedOrEmpty) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: extraction.error || "Document is empty or unreadable.",
          page_count: extraction.pageCount,
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      return { success: false, chunksCount: 0, error: extraction.error };
    }

    // 2. Chunk text
    const rawChunks: RawChunk[] = chunkDocument(
      extraction.pages.length > 0 ? extraction.pages : extraction.text
    );

    if (rawChunks.length === 0) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: "No usable text chunks could be extracted.",
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      return { success: false, chunksCount: 0, error: "No usable text chunks could be extracted." };
    }

    // 3. Generate embeddings
    const chunkTexts = rawChunks.map((c) => c.content);
    const embeddings = await generateBatchEmbeddings(chunkTexts);

    // 4. Idempotent cleanup: Delete any previously existing chunks for this document
    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId);

    // 5. Insert chunks
    const chunkRows = rawChunks.map((c, idx) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: c.chunkIndex,
      content: c.content,
      page_number: c.pageNumber,
      section_title: c.sectionTitle,
      token_count: c.tokenCount,
      embedding: embeddings[idx] ?? null,
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkRows);

    if (insertError) {
      throw insertError;
    }

    // 6. Mark document as processed
    await supabase
      .from("documents")
      .update({
        status: "processed",
        processing_error: null,
        page_count: extraction.pageCount,
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    return { success: true, chunksCount: chunkRows.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Processing error occurred";
    await supabase
      .from("documents")
      .update({
        status: "failed",
        processing_error: errorMsg,
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    return { success: false, chunksCount: 0, error: errorMsg };
  }
}
