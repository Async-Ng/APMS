export type EmbeddingInputType = "search_document" | "search_query";

export type AiProviderName = "bedrock" | "gemini";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const EMBEDDING_DIMENSIONS = 1024;

export const CHAT_MAX_OUTPUT_TOKENS = 1024;
