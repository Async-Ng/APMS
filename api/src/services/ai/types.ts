export type EmbeddingInputType = "search_document" | "search_query" | "similarity";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Dimensions for Xenova/bge-small-en-v1.5 (local provider only — Vertex AI Gemini uses 1024 via env) */
export const EMBEDDING_DIMENSIONS = 384;

export const CHAT_MAX_OUTPUT_TOKENS = 4096;

/** RAG retrieval tuning */
export const CONTEXT_CHUNKS = 10;
export const VECTOR_SEARCH_CANDIDATES = 100;
export const MIN_CHUNK_SCORE = 0.65;
export const CONTEXT_CHUNK_MAX_CHARS = 1500;
export const HISTORY_MESSAGES = 6;
