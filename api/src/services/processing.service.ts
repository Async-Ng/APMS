import type { Types } from "mongoose";

import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { loadEnv } from "../config/env";
import * as aiService from "./ai/ai.service";
import { isGeminiThrottleError } from "./ai/gemini-retry";
import { chunkSegments } from "./chunking.service";
import { extractText } from "./extraction.service";
import * as s3Service from "./s3.service";

const QUOTA_RETRY_BACKOFF_MS = [5 * 60_000, 10 * 60_000, 20 * 60_000, 30 * 60_000];

function nextQuotaRetryAt(processingAttempts: number): Date {
  const backoffMs =
    QUOTA_RETRY_BACKOFF_MS[Math.min(processingAttempts, QUOTA_RETRY_BACKOFF_MS.length - 1)];
  return new Date(Date.now() + backoffMs!);
}

const processingInFlight = new Set<string>();

export async function processDocument(documentId: Types.ObjectId): Promise<void> {
  const key = documentId.toString();
  if (processingInFlight.has(key)) return;
  processingInFlight.add(key);

  const env = loadEnv();
  const embedConcurrency = env.EMBED_CONCURRENCY;

  try {
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

      document.chunkCount = 0;
      await document.save();

      console.log(`[processing] Starting document ${documentId.toString()}`);

      // 1. Download file from S3
      const buffer = await s3Service.getObjectBuffer(document.s3Key);

      // 2. Extract text
      const { pageCount, segments, extractionMode, extractionConfidence } = await extractText(
        buffer,
        document.mimeType,
      );

      // Update pageCount if we got one
      if (pageCount !== null) {
        document.pageCount = pageCount;
      }
      document.extractionMode = extractionMode;
      document.extractionConfidence = extractionConfidence;

      // 3. Chunk text (structure-based, page-aware segments — no embedding calls)
      const chunks = chunkSegments(
        segments.length > 0 ? segments : [{ text: "", pageNumber: null }],
      );

      if (chunks.length > 0) {
        // 4. Embed chunks in concurrent batches and save to DB
        // Delete any existing chunks first (retry safety)
        await DocumentChunk.deleteMany({ documentId: document._id });

        const batches: (typeof chunks)[] = [];
        for (let i = 0; i < chunks.length; i += env.EMBED_BATCH_SIZE) {
          batches.push(chunks.slice(i, i + env.EMBED_BATCH_SIZE));
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
                queryText: chunk.queryText,
                pageNumber: chunk.pageNumber,
                sectionPath: chunk.sectionPath,
                displayHeading: chunk.displayHeading,
                blockType: chunk.blockType,
                extractionMode: chunk.extractionMode,
                extractionConfidence: chunk.extractionConfidence,
                embedding: embeddings[j],
              }));
            }),
          );

          const inserted = results.flat();
          await DocumentChunk.insertMany(inserted);

          document.chunkCount += inserted.length;
          await document.save();
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
      document.nextRetryAt = null;
      await document.save();
    } catch (error) {
      console.error(`[processing] Failed for document ${documentId.toString()}:`, error);
      document.status = "failed";
      document.lastError =
        error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      // Quota errors need to wait out the per-minute window — schedule a later retry
      // instead of letting the worker re-hit the same exhausted quota on the next poll.
      document.nextRetryAt = isGeminiThrottleError(error)
        ? nextQuotaRetryAt(document.processingAttempts)
        : null;
      await document.save();
    }
  } finally {
    processingInFlight.delete(key);
  }
}
