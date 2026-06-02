import {
  GoogleGenerativeAI,
  TaskType,
  type Content,
  type EmbedContentRequest,
} from "@google/generative-ai";

import { loadEnv } from "../../config/env";
import type { ChatTurn, EmbeddingInputType } from "./types";
import { CHAT_MAX_OUTPUT_TOKENS, EMBEDDING_DIMENSIONS } from "./types";

/**
 * Ordered list of chat models to try when the primary model hits a 429 quota error.
 * Models are tried in sequence until one succeeds.
 * The primary model from GEMINI_CHAT_MODEL env var is always tried first.
 * Order: highest RPD first to maximise daily capacity.
 */
const CHAT_FALLBACK_MODELS = [
  "gemini-2.5-flash",         // 20 RPD, 5 RPM
  "gemini-3.1-flash-lite",    // 500 RPD, 15 RPM — highest daily quota
  "gemini-2.5-flash-lite",    // 20 RPD, 10 RPM
  "gemini-3.5-flash",         // 20 RPD, 5 RPM
  "gemini-3-flash",           // 20 RPD, 5 RPM
];

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded") || msg.includes("Too Many Requests");
}

function getClient(): GoogleGenerativeAI {
  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

function embeddingTaskType(inputType: EmbeddingInputType): TaskType {
  return inputType === "search_query" ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT;
}

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  const env = loadEnv();
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });

  const embedRequest = {
    content: { role: "user", parts: [{ text }] },
    taskType: embeddingTaskType(inputType),
    outputDimensionality: EMBEDDING_DIMENSIONS,
  } as EmbedContentRequest & { outputDimensionality: number };

  const result = await model.embedContent(embedRequest);

  const values = result.embedding.values;
  if (!values?.length) {
    throw new Error("Gemini embedding response missing values");
  }

  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${values.length}`,
    );
  }

  return [...values];
}

async function tryChatWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  systemPrompt: string,
  history: Content[],
  lastMessage: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    },
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error(`Gemini model ${modelName} returned empty assistant message`);
  }

  return text;
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  const env = loadEnv();
  const genAI = getClient();

  if (messages.length === 0) {
    throw new Error("chatWithContext requires at least one message");
  }

  const last = messages.at(-1);
  if (!last || last.role !== "user") {
    throw new Error("Last chat message must be from user");
  }

  const history: Content[] = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Build deduplicated model list: primary model first, then fallbacks
  const primaryModel = env.GEMINI_CHAT_MODEL;
  const modelsToTry = [
    primaryModel,
    ...CHAT_FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const text = await tryChatWithModel(genAI, modelName, systemPrompt, history, last.content);
      if (modelName !== primaryModel) {
        console.warn(`[gemini] Primary model "${primaryModel}" quota exceeded. Used fallback "${modelName}".`);
      }
      return text;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`[gemini] Model "${modelName}" quota exceeded, trying next fallback...`);
        lastError = error;
        continue;
      }
      // Non-quota error (auth, model not found, etc.) — fail immediately
      throw error;
    }
  }

  // All models exhausted
  throw new Error(
    `All Gemini chat models exhausted quota. Tried: ${modelsToTry.join(", ")}. ` +
    `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
