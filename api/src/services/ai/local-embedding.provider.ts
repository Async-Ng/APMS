import type { EmbeddingInputType } from "./types";
import { EMBEDDING_DIMENSIONS } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineInstance = any;

/**
 * Singleton pipeline — model is loaded once on first call (or via initLocalEmbedding())
 * and reused for all subsequent calls.
 *
 * Model: Xenova/bge-small-en-v1.5
 * - 384 dimensions
 * - ~30MB quantized — fits comfortably in Render Free (512MB RAM)
 * - Supports academic/technical text retrieval well
 * - Runs entirely in Node.js via WebAssembly (no Python, no GPU needed)
 * - Model files cached at ~/.cache/huggingface after first download
 */
let pipelineInstance: PipelineInstance | null = null;
let initPromise: Promise<PipelineInstance> | null = null;

const MODEL_NAME = "Xenova/bge-small-en-v1.5";

// bge-small-en-v1.5 does not require task-type prefixes
const TASK_PREFIX: Record<EmbeddingInputType, string> = {
  search_document: "",
  search_query: "",
};

async function getPipeline(): Promise<PipelineInstance> {
  if (pipelineInstance) return pipelineInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { pipeline } = await import("@xenova/transformers");
    const start = Date.now();
    console.log(`[local-embed] Loading model "${MODEL_NAME}"...`);
    const instance = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true, // Use quantized model for smaller size and faster inference
    });
    console.log(`[local-embed] Model ready in ${Date.now() - start}ms`);
    pipelineInstance = instance;
    return instance;
  })();

  return initPromise;
}

/**
 * Pre-loads the embedding model during server startup.
 * Call this once in index.ts to avoid cold-load latency on the first request.
 */
export async function initLocalEmbedding(): Promise<void> {
  await getPipeline();
}

/**
 * Embeds a text string using the local nomic-embed-text model.
 * Returns a normalized float32 vector of EMBEDDING_DIMENSIONS (768) values.
 */
export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "search_document",
): Promise<number[]> {
  const pipe = await getPipeline();

  const prefix = TASK_PREFIX[inputType];
  const input = prefix + text;

  const output = await pipe(input, { pooling: "mean", normalize: true });

  // output.data is a Float32Array
  const values = Array.from(output.data as Float32Array);

  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `[local-embed] Dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${values.length}. ` +
        "Ensure EMBEDDING_DIMENSIONS in types.ts matches the model output.",
    );
  }

  return values;
}
