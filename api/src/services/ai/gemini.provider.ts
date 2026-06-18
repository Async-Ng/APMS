import { GoogleGenAI, type Content } from "@google/genai";

import { loadEnv } from "../../config/env";
import { normalizeVector } from "./embedding-utils";
import { withGeminiRetry } from "./gemini-retry";
import type { ChatTurn, EmbeddingInputType } from "./types";
import { CHAT_MAX_OUTPUT_TOKENS } from "./types";

const CHAT_GENERATION_CONFIG = {
  maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
  temperature: 0.3,
  thinkingConfig: { thinkingBudget: 0 },
} as const;

/**
 * Ordered list of chat models to try when the primary model hits a 429 quota error.
 * The primary model from GEMINI_CHAT_MODEL env var is always tried first.
 */
const CHAT_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash",
];

/**
 * Models to try for image/vision description. gemini-2.5-flash is multimodal,
 * so the chat fallback chain works for vision too.
 */
const VISION_FALLBACK_MODELS = CHAT_FALLBACK_MODELS;

const FULLY_NORMALIZED_EMBEDDING_DIMS = 3072;

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

function getVertexClient(): GoogleGenAI {
  const env = loadEnv();
  if (!env.GOOGLE_CLOUD_PROJECT?.trim()) {
    throw new Error("GOOGLE_CLOUD_PROJECT is not configured (required for Vertex AI)");
  }

  return new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
  });
}

function embeddingTaskType(inputType: EmbeddingInputType): string {
  switch (inputType) {
    case "search_query":
      return "RETRIEVAL_QUERY";
    case "similarity":
      return "SEMANTIC_SIMILARITY";
    default:
      return "RETRIEVAL_DOCUMENT";
  }
}

function extractEmbeddingValues(result: {
  embeddings?: Array<{ values?: number[] }>;
  embedding?: { values?: number[] };
}): number[] {
  const fromList = result.embeddings?.[0]?.values;
  if (fromList?.length) {
    return [...fromList];
  }

  const fromSingle = result.embedding?.values;
  if (fromSingle?.length) {
    return [...fromSingle];
  }

  throw new Error("Vertex embedding response missing values");
}

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  const env = loadEnv();
  const ai = getVertexClient();
  const outputDimension = env.GEMINI_EMBEDDING_OUTPUT_DIMENSION;

  const result = await withGeminiRetry(
    () =>
      ai.models.embedContent({
        model: env.GEMINI_EMBEDDING_MODEL,
        contents: text,
        config: {
          taskType: embeddingTaskType(inputType),
          outputDimensionality: outputDimension,
        },
      }),
    "embed",
  );

  let values = extractEmbeddingValues(result);

  if (values.length !== outputDimension) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${outputDimension}, got ${values.length}`,
    );
  }

  if (outputDimension < FULLY_NORMALIZED_EMBEDDING_DIMS) {
    values = normalizeVector(values);
  }

  return values;
}

function toGenAiContents(messages: ChatTurn[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function logMaxTokensWarning(
  modelName: string,
  finishReason: string | undefined,
  usageMetadata: unknown,
): void {
  if (finishReason !== "MAX_TOKENS") return;

  console.warn(
    `[gemini] Model ${modelName} hit MAX_TOKENS output limit. usageMetadata=${JSON.stringify(usageMetadata ?? {})}`,
  );
}

async function tryChatWithModel(
  ai: GoogleGenAI,
  modelName: string,
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: toGenAiContents(messages),
    config: {
      systemInstruction: systemPrompt,
      ...CHAT_GENERATION_CONFIG,
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  logMaxTokensWarning(modelName, finishReason, response.usageMetadata);

  if (finishReason === "RECITATION" || finishReason === "SAFETY" || finishReason === "OTHER") {
    throw new Error(
      `Gemini model ${modelName} stopped generation early (finishReason=${finishReason})`,
    );
  }

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error(`Gemini model ${modelName} returned empty assistant message`);
  }

  return text;
}

async function* tryChatStreamWithModel(
  ai: GoogleGenAI,
  modelName: string,
  systemPrompt: string,
  messages: ChatTurn[],
): AsyncGenerator<string> {
  const stream = await ai.models.generateContentStream({
    model: modelName,
    contents: toGenAiContents(messages),
    config: {
      systemInstruction: systemPrompt,
      ...CHAT_GENERATION_CONFIG,
    },
  });

  let finishReason: string | undefined;
  let usageMetadata: unknown;

  for await (const chunk of stream) {
    finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
    if (chunk.usageMetadata) {
      usageMetadata = chunk.usageMetadata;
    }
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }

  logMaxTokensWarning(modelName, finishReason, usageMetadata);

  if (finishReason === "RECITATION" || finishReason === "SAFETY" || finishReason === "OTHER") {
    throw new Error(
      `Gemini model ${modelName} stopped generation early (finishReason=${finishReason})`,
    );
  }
}

export async function embedBatch(
  texts: string[],
  inputType: EmbeddingInputType = "search_document",
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const env = loadEnv();
  const ai = getVertexClient();
  const outputDimension = env.GEMINI_EMBEDDING_OUTPUT_DIMENSION;

  const result = await withGeminiRetry(
    () =>
      ai.models.embedContent({
        model: env.GEMINI_EMBEDDING_MODEL,
        contents: texts,
        config: {
          taskType: embeddingTaskType(inputType),
          outputDimensionality: outputDimension,
        },
      }),
    "embed",
  );

  const embeddings = result.embeddings;
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `Batch embedding mismatch: expected ${texts.length}, got ${embeddings?.length ?? 0}`,
    );
  }

  return embeddings.map((e) => {
    const values = [...(e.values ?? [])];
    if (values.length !== outputDimension) {
      throw new Error(`Dimension mismatch: expected ${outputDimension}, got ${values.length}`);
    }
    return outputDimension < FULLY_NORMALIZED_EMBEDDING_DIMS ? normalizeVector(values) : values;
  });
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  const env = loadEnv();
  const ai = getVertexClient();

  if (messages.length === 0) {
    throw new Error("chatWithContext requires at least one message");
  }

  const last = messages.at(-1);
  if (!last || last.role !== "user") {
    throw new Error("Last chat message must be from user");
  }

  const primaryModel = env.GEMINI_CHAT_MODEL;
  const modelsToTry = [
    primaryModel,
    ...CHAT_FALLBACK_MODELS.filter((model) => model !== primaryModel),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const text = await tryChatWithModel(ai, modelName, systemPrompt, messages);
      if (modelName !== primaryModel) {
        console.warn(
          `[gemini] Primary model "${primaryModel}" quota exceeded. Used fallback "${modelName}".`,
        );
      }
      return text;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`[gemini] Model "${modelName}" quota exceeded, trying next fallback...`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `All Gemini chat models exhausted quota. Tried: ${modelsToTry.join(", ")}. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export async function* chatWithContextStream(
  systemPrompt: string,
  messages: ChatTurn[],
): AsyncGenerator<string> {
  const env = loadEnv();
  const ai = getVertexClient();

  if (messages.length === 0) {
    throw new Error("chatWithContextStream requires at least one message");
  }

  const last = messages.at(-1);
  if (!last || last.role !== "user") {
    throw new Error("Last chat message must be from user");
  }

  const primaryModel = env.GEMINI_CHAT_MODEL;
  const modelsToTry = [
    primaryModel,
    ...CHAT_FALLBACK_MODELS.filter((model) => model !== primaryModel),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      let yielded = false;
      for await (const delta of tryChatStreamWithModel(ai, modelName, systemPrompt, messages)) {
        yielded = true;
        yield delta;
      }
      if (!yielded) {
        throw new Error(`Gemini model ${modelName} returned empty assistant message`);
      }
      if (modelName !== primaryModel) {
        console.warn(
          `[gemini] Primary model "${primaryModel}" quota exceeded. Used fallback "${modelName}" for stream.`,
        );
      }
      return;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`[gemini] Model "${modelName}" quota exceeded, trying next fallback...`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `All Gemini chat models exhausted quota. Tried: ${modelsToTry.join(", ")}. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function tryDescribeWithModel(
  ai: GoogleGenAI,
  modelName: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      maxOutputTokens: 1024,
      temperature: 0.1,
    },
  });

  // An empty response is valid for vision (e.g. a blank/decorative image).
  return response.text?.trim() ?? "";
}

/**
 * Sends an image to a Gemini multimodal model and returns a text description / OCR
 * of its contents. Reuses the chat quota-fallback chain.
 */
export async function describeImage(
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
): Promise<string> {
  const env = loadEnv();
  const ai = getVertexClient();

  const primaryModel = env.GEMINI_VISION_MODEL;
  const modelsToTry = [
    primaryModel,
    ...VISION_FALLBACK_MODELS.filter((model) => model !== primaryModel),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      return await withGeminiRetry(
        () => tryDescribeWithModel(ai, modelName, imageBase64, imageMimeType, prompt),
        "vision",
      );
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`[gemini] Vision model "${modelName}" quota exceeded, trying next fallback...`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `All Gemini vision models exhausted quota. Tried: ${modelsToTry.join(", ")}. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
