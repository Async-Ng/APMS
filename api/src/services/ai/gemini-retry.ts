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

export function isGeminiTransientError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 502 || status === 503 || status === 504) return true;

  const msg = error instanceof Error ? error.message : String(error);
  return /\b(502|503|504)\b/.test(msg) || /bad gateway|service unavailable/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  label: "embed" | "chat" | "vision",
): Promise<T> {
  const env = loadEnv();

  let lastError: unknown;
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const isThrottle = isGeminiThrottleError(error);
      const isTransient = !isThrottle && isGeminiTransientError(error);

      if (!isThrottle && !isTransient) break;

      // Quota windows reset roughly per-minute, so 429s need a much longer backoff
      // than transient 502/503/504s — and fewer retries, since the document-level
      // nextRetryAt backoff (processing.service.ts) handles the deeper wait.
      const maxRetries = isThrottle ? env.GEMINI_QUOTA_MAX_RETRIES : env.GEMINI_MAX_RETRIES;
      const baseMs = isThrottle ? env.GEMINI_QUOTA_RETRY_BASE_MS : env.GEMINI_RETRY_BASE_MS;

      if (attempt >= maxRetries) break;

      const delayMs = baseMs * 2 ** attempt + Math.floor(Math.random() * 250);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[gemini-retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} hit a ${isThrottle ? "quota" : "transient"} error, retrying in ${delayMs}ms: ${reason.slice(0, 120)}`,
      );
      await sleep(delayMs);
      attempt++;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Gemini ${label} failed after ${attempt + 1} attempts`);
}
