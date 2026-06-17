import { loadEnv } from "../../config/env";

export function isGeminiThrottleError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("Too Many Requests") ||
    msg.toLowerCase().includes("rate limit")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  label: "embed" | "chat" | "vision",
): Promise<T> {
  const env = loadEnv();
  const maxRetries = env.GEMINI_MAX_RETRIES;
  const baseMs = env.GEMINI_RETRY_BASE_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isGeminiThrottleError(error) || attempt >= maxRetries) {
        break;
      }

      const delayMs = baseMs * 2 ** attempt + Math.floor(Math.random() * 250);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[gemini-retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} throttled, retrying in ${delayMs}ms: ${reason.slice(0, 120)}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Gemini ${label} failed after ${maxRetries + 1} attempts`);
}
