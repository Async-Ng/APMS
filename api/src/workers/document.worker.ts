import { Document } from "../models/document.model";
import { processDocument } from "../services/processing.service";

const POLL_INTERVAL_MS = 30_000;
let running = false;

async function runOnce(): Promise<void> {
  const pending = await Document.find({ status: "processing" }).select("_id").lean();

  if (pending.length === 0) return;

  console.log(`[worker] Found ${pending.length} document(s) to process`);

  for (const doc of pending) {
    await processDocument(doc._id);
  }
}

async function loop(): Promise<void> {
  while (running) {
    try {
      await runOnce();
    } catch (error) {
      console.error("[worker] Unexpected error in poll loop:", error);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export function startDocumentWorker(): void {
  if (running) return;
  running = true;
  console.log(`[worker] Document processing worker started (interval: ${POLL_INTERVAL_MS}ms)`);
  void loop();
}

export function stopDocumentWorker(): void {
  running = false;
}
