import type { ChatTurn, EmbeddingInputType } from "./types";
import * as geminiProvider from "./gemini.provider";

export type { ChatTurn, EmbeddingInputType } from "./types";

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  return geminiProvider.embedText(text, inputType);
}

export async function embedBatch(
  texts: string[],
  inputType: EmbeddingInputType = "search_document",
): Promise<number[][]> {
  return geminiProvider.embedBatch(texts, inputType);
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  return geminiProvider.chatWithContext(systemPrompt, messages);
}
