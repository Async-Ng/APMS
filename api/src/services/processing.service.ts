import type { Types } from "mongoose";

import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import * as aiService from "./ai/ai.service";
import { chunkText } from "./chunking.service";
import { extractText } from "./extraction.service";
import * as s3Service from "./s3.service";

export async function processDocument(documentId: Types.ObjectId): Promise<void> {
  const document = await Document.findById(documentId);

  if (!document || !["processing", "failed"].includes(document.status)) {
    return;
  }

  try {
    if (document.status === "failed") {
      document.status = "processing";
      await document.save();
    }

    console.log(`[processing] Starting document ${documentId.toString()}`);

    // 1. Download file from S3
    const buffer = await s3Service.getObjectBuffer(document.s3Key);

    // 2. Extract text
    const { text, pageCount } = await extractText(buffer, document.mimeType);

    // Update pageCount if we got one
    if (pageCount !== null) {
      document.pageCount = pageCount;
    }

    // 3. Chunk text
    const chunks = chunkText(text, pageCount);

    if (chunks.length > 0) {
      // 4. Embed each chunk and save to DB
      // Delete any existing chunks first (retry safety)
      await DocumentChunk.deleteMany({ documentId: document._id });

      for (const chunk of chunks) {
        const embedding = await aiService.embedText(chunk.content);

        await DocumentChunk.create({
          documentId: document._id,
          ownerId: document.ownerId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          embedding,
        });
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
    await document.save();
  } catch (error) {
    console.error(`[processing] Failed for document ${documentId.toString()}:`, error);
    document.status = "failed";
    await document.save();
  }
}
