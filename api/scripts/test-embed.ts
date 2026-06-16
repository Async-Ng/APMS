/**
 * Smoke test: embed one text via Vertex AI Gemini.
 * Usage: npx tsx --env-file=.env scripts/test-embed.ts [text]
 */
import { loadEnv } from "../src/config/env";
import * as aiService from "../src/services/ai/ai.service";

async function main(): Promise<void> {
  const env = loadEnv();
  const text = process.argv.slice(2).join(" ").trim() || "APMS embedding smoke test";

  const expectedDims = env.GEMINI_EMBEDDING_OUTPUT_DIMENSION;

  console.log(`[test-embed] Project: ${env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`[test-embed] Location: ${env.GOOGLE_CLOUD_LOCATION}`);
  console.log(`[test-embed] Model: ${env.GEMINI_EMBEDDING_MODEL}`);
  console.log(`[test-embed] Output dimension: ${expectedDims}`);
  console.log(`[test-embed] Text: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`);

  const start = Date.now();
  const vector = await aiService.embedText(text, "search_document");
  const elapsed = Date.now() - start;

  console.log(`[test-embed] OK in ${elapsed}ms — vector length: ${vector.length}`);
  console.log(`[test-embed] First 5 values: [${vector.slice(0, 5).map((v) => v.toFixed(6)).join(", ")}]`);

  if (vector.length !== expectedDims) {
    throw new Error(`Dimension mismatch: expected ${expectedDims}, got ${vector.length}`);
  }
}

main().catch((err) => {
  console.error("[test-embed] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
