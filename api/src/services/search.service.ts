import type { Types } from "mongoose";

import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import * as aiService from "./ai/ai.service";
import { findLexicalChunks, mergeRetrievedChunks } from "./ai/retrieval.service";
import { getSharedDocumentIds } from "./share.service";

export interface SearchResult {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  pageNumber: number | null;
  score: number;
  sectionPath: string[];
  heading: string | null;
}

export async function semanticSearch(
  userId: Types.ObjectId,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const queryVector = await aiService.embedText(query, "search_query");

  const [sharedDocIds, publicDocIds] = await Promise.all([
    getSharedDocumentIds(userId),
    Document.find({
      visibility: "public",
      courseSlotId: { $ne: null },
      deletedAt: null,
      status: { $ne: "pending" },
    }).distinct("_id"),
  ]);
  const readableDocIds = [...sharedDocIds, ...publicDocIds];
  const vectorFilter =
    readableDocIds.length > 0
      ? { $or: [{ ownerId: userId }, { documentId: { $in: readableDocIds } }] }
      : { ownerId: userId };

  const vectorResults = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vector_index",
        path: "embedding",
        queryVector,
        filter: vectorFilter,
        numCandidates: limit * 15,
        limit: Math.max(limit * 2, 12),
      },
    },
    {
      $project: {
        documentId: 1,
        content: 1,
        queryText: 1,
        pageNumber: 1,
        chunkIndex: 1,
        sectionPath: 1,
        displayHeading: 1,
        blockType: 1,
        extractionMode: 1,
        extractionConfidence: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  const vectorChunks = vectorResults.map((result) => {
    const chunk = {
      documentId: result.documentId as Types.ObjectId,
      content: result.content as string,
      queryText: String(result.queryText ?? ""),
      pageNumber: (result.pageNumber as number | null) ?? null,
      score: result.score as number,
      sectionPath: (result.sectionPath as string[] | undefined) ?? [],
      displayHeading: (result.displayHeading as string | null | undefined) ?? null,
      blockType: String(result.blockType ?? "paragraph"),
      extractionMode: String(result.extractionMode ?? "text"),
      extractionConfidence: String(result.extractionConfidence ?? "medium"),
    };
    return typeof result.chunkIndex === "number"
      ? { ...chunk, chunkIndex: result.chunkIndex }
      : chunk;
  });

  const { chunks: lexicalChunks } = await findLexicalChunks(vectorFilter, query);
  const merged = mergeRetrievedChunks(vectorChunks, lexicalChunks).slice(0, Math.max(limit * 2, 12));

  if (merged.length === 0) {
    return [];
  }

  const documentIds = [...new Set(merged.map((result) => result.documentId.toString()))];
  const documents = await Document.find({
    _id: { $in: documentIds },
    deletedAt: null,
    $or: [{ ownerId: userId }, { _id: { $in: readableDocIds } }],
  })
    .select("_id title")
    .lean();

  const titleMap = new Map(documents.map((d) => [d._id.toString(), d.title]));

  return merged
    .filter((result) => titleMap.has(result.documentId.toString()))
    .slice(0, limit)
    .map((result) => ({
      documentId: result.documentId.toString(),
      documentTitle: titleMap.get(result.documentId.toString()) ?? "",
      excerpt: result.content,
      pageNumber: result.pageNumber ?? null,
      score: result.score,
      sectionPath: result.sectionPath,
      heading: result.displayHeading,
    }));
}
