export type EmbeddingInputType = "search_document" | "search_query" | "similarity";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Dimensions for Xenova/bge-small-en-v1.5 (local provider only — Vertex AI Gemini uses 1024 via env) */
export const EMBEDDING_DIMENSIONS = 384;

export const CHAT_MAX_OUTPUT_TOKENS = 4096;

/** RAG retrieval tuning */
/** How many chunks to pull from vector search before reranking. */
export const RETRIEVE_CHUNKS = 24;
/** How many chunks (after reranking) to inject into the prompt as context. */
export const CONTEXT_CHUNKS = 8;
export const VECTOR_SEARCH_CANDIDATES = 150;
export const MIN_CHUNK_SCORE = 0.65;
export const CONTEXT_CHUNK_MAX_CHARS = 1500;
export const HISTORY_MESSAGES = 6;
/** Number of adjacent chunks (by chunkIndex) to merge around each retrieved chunk. */
export const NEIGHBOR_WINDOW = 1;
