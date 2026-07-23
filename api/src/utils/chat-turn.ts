/**
 * BR-025 chat turn predicate: a normal question creates a user message;
 * regenerate creates an assistant message with isRegeneration: true.
 */
export const CHAT_TURN_OR = [
  { role: "user" },
  { role: "assistant", isRegeneration: true },
] as const;

export function chatTurnCreatedSince(since: Date): Record<string, unknown> {
  return {
    createdAt: { $gte: since },
    $or: [...CHAT_TURN_OR],
  };
}

export function startOfUtcDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Inclusive range of UTC calendar days ending today, as YYYY-MM-DD (oldest first). */
export function lastNUtcDateKeys(n: number, end = new Date()): string[] {
  const endDay = startOfUtcDay(end);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(endDay);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}
