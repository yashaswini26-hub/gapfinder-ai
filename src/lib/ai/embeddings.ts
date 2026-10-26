import { getGeminiClient } from "./provider";

export const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-004";
export const VECTOR_DIMENSION = 768;

/**
 * Generates vector embedding for a single text chunk.
 * Returns array of 768 floating point numbers.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const ai = getGeminiClient();
  if (!ai) {
    return null;
  }

  const model = process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;

  try {
    const response = await ai.models.embedContent({
      model,
      contents: text,
      config: {
        outputDimensionality: VECTOR_DIMENSION,
      },
    });

    const values =
      (response as any).embedding?.values ||
      (response as any).embeddings?.[0]?.values;
    if (values && values.length > 0) {
      return values;
    }
    return null;
  } catch (err) {
    console.error("Embedding generation error:", err);
    return null;
  }
}

/**
 * Batch generates embeddings for multiple chunks with controlled concurrency.
 */
export async function generateBatchEmbeddings(
  texts: string[],
  batchSize: number = 8
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((text) => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
