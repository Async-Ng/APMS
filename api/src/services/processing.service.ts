import type { Types } from "mongoose";

import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { loadEnv } from "../config/env";
import * as aiService from "./ai/ai.service";
import { chunkSegments } from "./chunking.service";
import { extractText } from "./extraction.service";
import * as s3Service from "./s3.service";

const EMBED_BATCH_SIZE = 20;

export async function processDocument(documentId: Types.ObjectId): Promise<void> {
  const env = loadEnv();
  const embedConcurrency = env.EMBED_CONCURRENCY;
  const document = await Document.findById(documentId);

  if (!document || !["processing", "failed"].includes(document.status)) {
    return;
  }

  try {
    if (document.status === "failed") {
      document.status = "processing";
      document.processingAttempts += 1;
      await document.save();
    }

    console.log(`[processing] Starting document ${documentId.toString()}`);

    // 1. Download file from S3
    const buffer = await s3Service.getObjectBuffer(document.s3Key);

    // 2. Extract text
    const { pageCount, segments } = await extractText(buffer, document.mimeType);

    // Update pageCount if we got one
    if (pageCount !== null) {
      document.pageCount = pageCount;
    }

    // 3. Chunk text (page-aware segments)
    const chunks = await chunkSegments(
      segments.length > 0 ? segments : [{ text: "", pageNumber: null }],
    );

    if (chunks.length > 0) {
      // 4. Embed chunks in concurrent batches and save to DB
      // Delete any existing chunks first (retry safety)
      await DocumentChunk.deleteMany({ documentId: document._id });

      const batches: (typeof chunks)[] = [];
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        batches.push(chunks.slice(i, i + EMBED_BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i += embedConcurrency) {
        const wave = batches.slice(i, i + embedConcurrency);

        const results = await Promise.all(
          wave.map(async (batch) => {
            const embeddings = await aiService.embedBatch(batch.map((c) => c.content));
            return batch.map((chunk, j) => ({
              documentId: document._id,
              ownerId: document.ownerId,
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              embedding: embeddings[j],
            }));
          }),
        );

        await DocumentChunk.insertMany(results.flat());
      }

      console.log(
        `[processing] Document ${documentId.toString()} — ${chunks.length} chunks embedded`,
      );
    } else {
      console.log(
        `[processing] Document ${documentId.toString()} — no text extracted, marking ready with 0 chunks`,
      );
    }

    // 5. Mark ready
    document.status = "ready";
    document.lastError = null;
    await document.save();
  } catch (error) {
    console.error(`[processing] Failed for document ${documentId.toString()}:`, error);
    document.status = "failed";
    document.lastError = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    await document.save();
  }
}
