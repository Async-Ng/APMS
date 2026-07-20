/**
 * Structured per-turn chat metrics, emitted as a single JSON log line with
 * tag "chat-metrics" so log tooling (CloudWatch Logs Insights, grep + jq)
 * can filter and aggregate latency, evidence-gate rate, and fallback usage.
 */
export interface ChatTurnMetrics {
  kind: "send" | "send_stream" | "regenerate" | "edit";
  userId: string;
  sessionId: string;
  mode: string;
  /** Time spent on retrieval + prompt building (query rewrite, vector/lexical search, rerank). */
  retrievalMs: number;
  /** Time spent generating the assistant answer (first byte to last). */
  generationMs: number;
  contextChunks: number;
  evidenceGatePassed: boolean;
  evidenceGateReason: string | null;
  citations: number;
  suggestedQuestions: number;
  answerChars: number;
  aborted: boolean;
  isRegeneration: boolean;
}

export function logChatMetrics(metrics: ChatTurnMetrics): void {
  console.log(
    JSON.stringify({
      tag: "chat-metrics",
      ts: new Date().toISOString(),
      ...metrics,
    }),
  );
}
