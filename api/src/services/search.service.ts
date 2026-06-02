import type { Types } from "mongoose";

import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import * as aiService from "./ai/ai.service";
import { getSharedDocumentIds } from "./share.service";

export interface SearchResult {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  pageNumber: number | null;
  score: number;
}

export async function semanticSearch(
  userId: Types.ObjectId,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const queryVector = await aiService.embedText(query, "search_query");

  const sharedDocIds = await getSharedDocumentIds(userId);
  const vectorFilter =
    sharedDocIds.length > 0
      ? { $or: [{ ownerId: userId }, { documentId: { $in: sharedDocIds } }] }
      : { ownerId: userId };

  // Atlas Vector Search via aggregation pipeline
  const results = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vector_index",
        path: "embedding",
        queryVector,
        filter: vectorFilter,
        numCandidates: limit * 10,
        limit,
      },
    },
    {
      $project: {
        documentId: 1,
        content: 1,
        pageNumber: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  if (results.length === 0) {
    return [];
  }

  // Populate document titles in one query
  const documentIds = [...new Set(results.map((r) => r.documentId.toString()))];
  const documents = await Document.find({
    _id: { $in: documentIds },
    deletedAt: null,
  })
    .select("_id title")
    .lean();

  const titleMap = new Map(documents.map((d) => [d._id.toString(), d.title]));

  return results
    .filter((r) => titleMap.has(r.documentId.toString()))
    .map((r) => ({
      documentId: r.documentId.toString(),
      documentTitle: titleMap.get(r.documentId.toString()) ?? "",
      excerpt: r.content as string,
      pageNumber: (r.pageNumber as number | null) ?? null,
      score: r.score as number,
    }));
}
