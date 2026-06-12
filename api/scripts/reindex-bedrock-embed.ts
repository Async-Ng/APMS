/**
 * Re-index all documents after switching Bedrock embedding model (e.g. v3 → Embed v4).
 *
 * Deletes existing chunks and resets ready documents to "processing" for the worker.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reindex-bedrock-embed.ts
 */
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";
import { DocumentChunk } from "../src/models/document-chunk.model";
import { Document } from "../src/models/document.model";

async function main() {
  const env = loadEnv();

  if (env.AI_PROVIDER !== "bedrock" && env.AI_PROVIDER !== "auto") {
    console.error(
      `AI_PROVIDER is '${env.AI_PROVIDER}'. Set AI_PROVIDER=bedrock (or auto) in .env first.`,
    );
    process.exit(1);
  }

  if (!env.BEDROCK_EMBEDDING_MODEL_ID) {
    console.error("BEDROCK_EMBEDDING_MODEL_ID is not set.");
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
  console.log(`Embedding model: ${env.BEDROCK_EMBEDDING_MODEL_ID}`);
  console.log(`Output dimension: ${env.BEDROCK_EMBEDDING_OUTPUT_DIMENSION}`);

  const readyDocs = await Document.find({
    status: "ready",
    deletedAt: null,
  })
    .select("_id title")
    .lean();

  console.log(`Found ${readyDocs.length} ready document(s) to re-index`);

  if (readyDocs.length === 0) {
    const chunkCount = await DocumentChunk.countDocuments();
    if (chunkCount > 0) {
      const deleted = await DocumentChunk.deleteMany({});
      console.log(`Deleted ${deleted.deletedCount} orphan chunk(s) (no ready documents)`);
    } else {
      console.log("Nothing to do.");
    }
    await mongoose.disconnect();
    return;
  }

  const docIds = readyDocs.map((d) => d._id);

  const deleted = await DocumentChunk.deleteMany({ documentId: { $in: docIds } });
  console.log(`Deleted ${deleted.deletedCount} old chunk(s)`);

  const updated = await Document.updateMany(
    { _id: { $in: docIds } },
    { $set: { status: "processing" } },
  );
  console.log(`Reset ${updated.modifiedCount} document(s) to status "processing"`);

  console.log("\nDone. Restart the API server — the document worker will re-embed via Bedrock.");
  console.log("Vector index stays at 1024 dims if BEDROCK_EMBEDDING_OUTPUT_DIMENSION=1024.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
