import { loadEnv } from "../../config/env";

export function isBedrockThrottleError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const msg = error instanceof Error ? error.message : String(error);

  return (
    name === "ThrottlingException" ||
    msg.includes("ThrottlingException") ||
    msg.includes("Too many tokens") ||
    msg.includes("Too Many Requests") ||
    msg.includes("429") ||
    msg.toLowerCase().includes("rate exceeded")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBedrockRetry<T>(
  operation: () => Promise<T>,
  label: "embed" | "chat",
): Promise<T> {
  const env = loadEnv();
  const maxRetries = env.BEDROCK_MAX_RETRIES;
  const baseMs = env.BEDROCK_RETRY_BASE_MS;

  let lastError: unknown;
  let sawThrottle = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (isBedrockThrottleError(error)) {
        sawThrottle = true;
      }

      if (!isBedrockThrottleError(error) || attempt >= maxRetries) {
        break;
      }

      const delayMs = baseMs * 2 ** attempt + Math.floor(Math.random() * 250);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `[bedrock-retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} throttled, retrying in ${delayMs}ms: ${reason.slice(0, 120)}`,
      );
      await sleep(delayMs);
    }
  }

  if (
    sawThrottle &&
    lastError instanceof Error &&
    lastError.name === "AccessDeniedException"
  ) {
    throw new Error(
      `Too many tokens per day (Bedrock ${label} quota exhausted after retries). ${lastError.message}`,
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Bedrock ${label} failed after ${maxRetries + 1} attempts`);
}
