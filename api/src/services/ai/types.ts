export type EmbeddingInputType = "search_document" | "search_query" | "similarity";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Dimensions for Xenova/bge-small-en-v1.5 (local provider only — Vertex AI Gemini uses 1024 via env) */
export const EMBEDDING_DIMENSIONS = 384;

export const CHAT_MAX_OUTPUT_TOKENS = 1024;
