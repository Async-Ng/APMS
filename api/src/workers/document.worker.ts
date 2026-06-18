import { loadEnv } from "../config/env";
import { Document, MAX_PROCESSING_ATTEMPTS } from "../models/document.model";
import { processDocument } from "../services/processing.service";

let running = false;

async function runOnce(): Promise<void> {
  const pending = await Document.find({
    $or: [
      { status: "processing" },
      { status: "failed", processingAttempts: { $lt: MAX_PROCESSING_ATTEMPTS } },
    ],
  })
    .select("_id")
    .lean();

  if (pending.length === 0) return;

  console.log(`[worker] Found ${pending.length} document(s) to process`);

  for (const doc of pending) {
    await processDocument(doc._id);
  }
}

async function loop(pollIntervalMs: number): Promise<void> {
  while (running) {
    try {
      await runOnce();
    } catch (error) {
      console.error("[worker] Unexpected error in poll loop:", error);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

export function startDocumentWorker(): void {
  if (running) return;
  running = true;

  const pollIntervalMs = loadEnv().DOCUMENT_WORKER_POLL_MS;
  console.log(`[worker] Document processing worker started (interval: ${pollIntervalMs}ms)`);

  void runOnce().catch((error) => {
    console.error("[worker] Unexpected error on initial run:", error);
  });
  void loop(pollIntervalMs);
}

export function stopDocumentWorker(): void {
  running = false;
}
