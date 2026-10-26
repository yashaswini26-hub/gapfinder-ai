export interface PageContent {
  pageNumber: number;
  text: string;
}

export interface RawChunk {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  tokenCount: number;
}

export interface ChunkingConfig {
  targetTokens: number; // default: 600 (~2400 chars)
  overlapTokens: number; // default: 100 (~400 chars)
  minChunkTokens: number; // default: 40 (~160 chars)
}

const DEFAULT_CONFIG: ChunkingConfig = {
  targetTokens: 600,
  overlapTokens: 100,
  minChunkTokens: 40,
};

// Rough token estimator: ~4 characters per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

// Check if a line looks like a section heading
function detectHeading(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length > 3 && trimmed.length < 90) {
    // Markdown headings
    if (/^#{1,4}\s+(.+)$/.test(trimmed)) {
      return trimmed.replace(/^#{1,4}\s+/, "").trim();
    }
    // Section / Chapter / Unit headers
    if (/^(Section|Chapter|Unit|Module|Topic|\d+\.\d+)\s*[:.-]?\s*(.+)/i.test(trimmed)) {
      return trimmed;
    }
    // All caps short headings
    if (trimmed === trimmed.toUpperCase() && /^[A-Z0-9\s.,:-]+$/.test(trimmed) && trimmed.length > 5) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Splits document pages or text into structured, overlapping chunks
 * with preserved page numbers and section headers.
 */
export function chunkDocument(
  pagesOrText: PageContent[] | string,
  customConfig?: Partial<ChunkingConfig>
): RawChunk[] {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const targetChars = config.targetTokens * 4;
  const overlapChars = config.overlapTokens * 4;

  const normalizedPages: PageContent[] =
    typeof pagesOrText === "string"
      ? [{ pageNumber: 1, text: pagesOrText }]
      : pagesOrText;

  const chunks: RawChunk[] = [];
  let currentChunkIndex = 0;
  let currentSectionTitle: string | null = null;

  for (const page of normalizedPages) {
    const rawParagraphs = page.text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let currentChunkText = "";
    let chunkStartPage: number = page.pageNumber;

    for (const paragraph of rawParagraphs) {
      // Check if this paragraph contains a heading
      const lines = paragraph.split("\n");
      for (const line of lines) {
        const heading = detectHeading(line);
        if (heading) {
          currentSectionTitle = heading;
        }
      }

      if ((currentChunkText + "\n\n" + paragraph).length <= targetChars) {
        currentChunkText = currentChunkText
          ? `${currentChunkText}\n\n${paragraph}`
          : paragraph;
      } else {
        // If current chunk has enough content, save it
        if (estimateTokens(currentChunkText) >= config.minChunkTokens) {
          chunks.push({
            chunkIndex: currentChunkIndex++,
            content: currentChunkText.trim(),
            pageNumber: chunkStartPage,
            sectionTitle: currentSectionTitle,
            tokenCount: estimateTokens(currentChunkText),
          });

          // Retain overlap from end of previous chunk
          const words = currentChunkText.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(overlapChars / 5)).join(" ");
          currentChunkText = overlapWords ? `${overlapWords}\n\n${paragraph}` : paragraph;
          chunkStartPage = page.pageNumber;
        } else {
          currentChunkText = currentChunkText ? `${currentChunkText}\n\n${paragraph}` : paragraph;
        }
      }
    }

    if (currentChunkText.trim().length > 0 && estimateTokens(currentChunkText) >= config.minChunkTokens) {
      chunks.push({
        chunkIndex: currentChunkIndex++,
        content: currentChunkText.trim(),
        pageNumber: chunkStartPage,
        sectionTitle: currentSectionTitle,
        tokenCount: estimateTokens(currentChunkText),
      });
    }
  }

  return chunks;
}
