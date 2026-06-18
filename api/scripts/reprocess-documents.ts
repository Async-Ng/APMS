/**
 * Re-process documents to rebuild chunks with the latest chunking pipeline.
 *
 * Usage:
 *   pnpm exec ts-node --files scripts/reprocess-documents.ts --documentId <id>
 *   pnpm exec ts-node --files scripts/reprocess-documents.ts --all-ready
 */
import "dotenv/config";

import mongoose from "mongoose";

import { loadEnv } from "../src/config/env";
import { DocumentChunk } from "../src/models/document-chunk.model";
import { Document } from "../src/models/document.model";
import { processDocument } from "../src/services/processing.service";

function parseArgs(): { documentId?: string; allReady: boolean } {
  const args = process.argv.slice(2);
  let documentId: string | undefined;
  let allReady = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--all-ready") {
      allReady = true;
    } else if (arg === "--documentId" && args[i + 1]) {
      documentId = args[++i];
    } else if (arg.startsWith("--documentId=")) {
      documentId = arg.slice("--documentId=".length);
    } else if (!arg.startsWith("-")) {
      documentId = arg;
    }
  }

  const out: { documentId?: string; allReady: boolean } = { allReady };
  if (documentId) out.documentId = documentId;
  return out;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const { documentId, allReady } = parseArgs();

  if (!documentId && !allReady) {
    throw new Error("Provide --documentId <id> or --all-ready");
  }

  await mongoose.connect(env.MONGODB_URI);

  const filter: Record<string, unknown> = { deletedAt: null };
  if (documentId) {
    filter._id = documentId;
  } else {
    filter.status = "ready";
  }

  const documents = await Document.find(filter).select("_id title status").sort({ title: 1 });

  if (documents.length === 0) {
    throw new Error(documentId ? `Document not found: ${documentId}` : "No ready documents found");
  }

  console.log(`[reprocess] Re-processing ${documents.length} document(s)...\n`);

  for (const doc of documents) {
    const before = await DocumentChunk.countDocuments({ documentId: doc._id });

    await Document.findByIdAndUpdate(doc._id, {
      status: "processing",
      lastError: null,
    });

    await processDocument(doc._id);

    const updated = await Document.findById(doc._id).select("status lastError").lean();
    const after = await DocumentChunk.countDocuments({ documentId: doc._id });

    const status = updated?.status ?? "unknown";
    const icon = status === "ready" ? "OK" : "FAIL";
    console.log(
      `${icon} | ${doc.title} | chunks ${before} → ${after} | status=${status}`,
    );
    if (updated?.lastError) {
      console.log(`     error: ${updated.lastError}`);
    }
  }

  console.log("\n[reprocess] Done.");
}

main()
  .catch((err: unknown) => {
    console.error("[reprocess] FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => void mongoose.disconnect());
