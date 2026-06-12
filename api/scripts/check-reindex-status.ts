import "dotenv/config";
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";
import { Document } from "../src/models/document.model";
import { DocumentChunk } from "../src/models/document-chunk.model";

async function main() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const readyDocs = await Document.find({ status: "ready", deletedAt: null }).select("_id").lean();
  const docIds = readyDocs.map((d) => d._id);
  const processing = await Document.countDocuments({ status: "processing", deletedAt: null });
  const ready = readyDocs.length;
  const failed = await Document.countDocuments({ status: "failed", deletedAt: null });
  const chunks = await DocumentChunk.countDocuments({ documentId: { $in: docIds } });
  const orphanChunks = await DocumentChunk.countDocuments({ documentId: { $nin: docIds } });
  const sample = await DocumentChunk.findOne({ documentId: { $in: docIds } })
    .select("embedding")
    .lean();
  console.log({
    processing,
    ready,
    failed,
    chunksForReadyDocs: chunks,
    orphanChunks,
    embeddingDims: sample?.embedding?.length ?? 0,
  });
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
