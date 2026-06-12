import { loadEnv } from "../../config/env";
import type { AiProviderName, ChatTurn, EmbeddingInputType } from "./types";
import * as bedrockProvider from "./bedrock.provider";
import * as geminiProvider from "./gemini.provider";
import * as localEmbeddingProvider from "./local-embedding.provider";

export { initLocalEmbedding } from "./local-embedding.provider";

export type { ChatTurn, EmbeddingInputType, AiProviderName } from "./types";

/** Locked after first Bedrock failure in auto mode (until API restart). */
let resolvedProvider: AiProviderName | null = null;

export function getActiveProvider(): AiProviderName {
  const env = loadEnv();
  if (resolvedProvider) return resolvedProvider;
  if (env.AI_PROVIDER === "gemini") return "gemini";
  if (env.AI_PROVIDER === "bedrock") return "bedrock";
  return "bedrock";
}

export function isBedrockFallbackError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("AccessDenied") ||
    msg.includes("not authorized") ||
    msg.includes("ThrottlingException") ||
    msg.includes("Too many tokens") ||
    msg.includes("ValidationException") ||
    msg.includes("ResourceNotFoundException") ||
    msg.includes("on-demand throughput isn't supported") ||
    msg.includes("inference profile") ||
    msg.includes("use case details") ||
    msg.includes("Marketplace")
  );
}

function activateGeminiFallback(reason: string): void {
  if (resolvedProvider === "gemini") return;
  resolvedProvider = "gemini";
  console.warn(
    `[ai] Bedrock unavailable (${reason}). Switched to Vertex Gemini for this process. ` +
      "Re-embed documents if chunks used a different embedding provider.",
  );
}

async function withProvider<T>(
  operation: "embed" | "chat",
  bedrockFn: () => Promise<T>,
  geminiFn: () => Promise<T>,
): Promise<T> {
  const env = loadEnv();
  const active = getActiveProvider();

  if (active === "gemini") {
    return geminiFn();
  }

  try {
    return await bedrockFn();
  } catch (error) {
    if (env.AI_PROVIDER !== "auto" || !isBedrockFallbackError(error)) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    activateGeminiFallback(reason);
    try {
      return await geminiFn();
    } catch (geminiError) {
      throw geminiError;
    }
  }
}

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  const env = loadEnv();
  // Embedding MUST use a consistent provider — never mix providers between
  // indexing (document upload) and querying (chat), or vector search breaks.
  if (env.AI_PROVIDER === "local") {
    return localEmbeddingProvider.embedText(text, inputType);
  }
  if (env.AI_PROVIDER === "gemini") {
    return geminiProvider.embedText(text, inputType);
  }
  return bedrockProvider.embedText(text, inputType);
}

export async function chatWithContext(
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string> {
  return withProvider(
    "chat",
    () => bedrockProvider.chatWithContext(systemPrompt, messages),
    () => geminiProvider.chatWithContext(systemPrompt, messages),
  );
}
