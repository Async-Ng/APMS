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

export async function* chatWithContextStream(
  systemPrompt: string,
  messages: ChatTurn[],
): AsyncGenerator<string> {
  yield* geminiProvider.chatWithContextStream(systemPrompt, messages);
}

export async function generateLite(
  prompt: string,
  options: { json?: boolean; maxOutputTokens?: number } = {},
): Promise<string> {
  return geminiProvider.generateLite(prompt, options);
}

export async function describeImage(
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
): Promise<string> {
  return geminiProvider.describeImage(imageBase64, imageMimeType, prompt);
}
