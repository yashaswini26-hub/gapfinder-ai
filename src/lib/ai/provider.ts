import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

export interface GenerateStructuredOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  schemaName?: string;
  temperature?: number;
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Initializes Google Gen AI client with GEMINI_API_KEY.
 * Returns null if key is not configured.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes("placeholder")) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Robust JSON extraction from LLM response text (handles markdown code fences).
 */
export function extractJsonFromText(text: string): unknown {
  let cleaned = text.trim();
  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    const lastFence = cleaned.lastIndexOf("```");
    if (firstNewline !== -1 && lastFence > firstNewline) {
      cleaned = cleaned.substring(firstNewline + 1, lastFence).trim();
    }
  }
  return JSON.parse(cleaned);
}

/**
 * Modular LLM caller that generates validated structured JSON using Zod schemas.
 */
export async function generateStructuredContent<T>(
  options: GenerateStructuredOptions<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      success: false,
      error: "Gemini API key is not configured. Live AI generation requires GEMINI_API_KEY.",
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const systemInstruction = `${options.systemInstruction || "You are an expert educational AI."}
CRITICAL: You must return raw JSON only that matches the requested schema. Do not add any introductory or conversational text.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction,
        temperature: options.temperature ?? 0.2,
      },
    });

    const rawText = response.text || "";
    if (!rawText.trim()) {
      return { success: false, error: "Model returned an empty response" };
    }

    const parsedJson = extractJsonFromText(rawText);
    const validated = options.schema.safeParse(parsedJson);

    if (!validated.success) {
      return {
        success: false,
        error: `Model output failed schema validation: ${validated.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    return { success: true, data: validated.data };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error during AI generation";
    return { success: false, error: errorMessage };
  }
}

/**
 * Text generation for explanations or conversational assistant.
 */
export async function generateText(
  options: GenerateTextOptions
): Promise<{ success: boolean; text?: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      success: false,
      error: "Gemini API key is not configured. Live AI assistant requires GEMINI_API_KEY.",
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.3,
      },
    });

    return { success: true, text: response.text || "" };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "AI generation failed";
    return { success: false, error: errorMessage };
  }
}
