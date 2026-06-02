/**
 * Re-index all documents using Gemini embeddings.
 *
 * Run after switching AI_PROVIDER=gemini to clear old Cohere/Bedrock chunks
 * and re-queue every ready document for re-processing.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reindex-gemini.ts
 */

import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";
import { DocumentChunk } from "../src/models/document-chunk.model";
import { Document } from "../src/models/document.model";

async function main() {
  const env = loadEnv();

  if (env.AI_PROVIDER !== "gemini") {
    console.error("AI_PROVIDER is not 'gemini'. Set AI_PROVIDER=gemini in .env first.");
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Count documents that have chunks (i.e. were previously indexed)
  const readyDocs = await Document.find({
    status: "ready",
    deletedAt: null,
  }).select("_id title").lean();

  console.log(`Found ${readyDocs.length} ready document(s) to re-index`);

  if (readyDocs.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const docIds = readyDocs.map((d) => d._id);

  // 1. Delete all existing chunks for these documents
  const deleted = await DocumentChunk.deleteMany({ documentId: { $in: docIds } });
  console.log(`Deleted ${deleted.deletedCount} old chunk(s)`);

  // 2. Reset status to "processing" so the worker picks them up
  const updated = await Document.updateMany(
    { _id: { $in: docIds } },
    { $set: { status: "processing" } },
  );
  console.log(`Reset ${updated.modifiedCount} document(s) to status "processing"`);

  console.log("\nDone. Start (or restart) the API server — the document worker will");
  console.log("automatically re-embed all documents using Gemini embedding-001.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
