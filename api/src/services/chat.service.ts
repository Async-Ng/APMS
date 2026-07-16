import type { Response } from "express";
import type { Types } from "mongoose";

import { loadEnv } from "../config/env";
import { createAppError, ErrorCode } from "../errors/error-codes";
import {
  buildCitationDeepLink,
  ChatMessage,
  toChatMessageResponse,
  type ChatMessageDocument,
} from "../models/chat-message.model";
import { ChatSession, toChatSessionResponse, type ChatSessionDocument } from "../models/chat-session.model";
import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { Folder } from "../models/folder.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import * as aiService from "./ai/ai.service";
import {
  buildCitationsFromResponse,
  normalizeCitationMarkers,
  type RetrievedChunk,
} from "./ai/citation-utils";
import {
  buildKeywordQuery,
  buildRetrievalDebugInfo,
  findCoverageChunks,
  findLexicalChunks,
  mergeRetrievedChunks,
  scoreRetrievedChunks,
  selectDiverseChunks,
  uniqueQueryVariants,
  type RetrievalDebugInfo,
} from "./ai/retrieval.service";
import {
  buildChatSystemPrompt,
  type ChatMode,
  PRESET_DEFAULT_CONTENT,
} from "./ai/chat-prompts";
import { rewriteQueryWithHistory } from "./ai/query-rewrite";
import { rerankChunks } from "./ai/rerank";
import type { ChatTurn } from "./ai/types";
import {
  CONTEXT_CHUNKS,
  CONTEXT_CHUNK_MAX_CHARS,
  COVERAGE_CHUNKS,
  HISTORY_MESSAGES,
  MIN_CHUNK_SCORE,
  NEIGHBOR_WINDOW,
  QUERY_VARIANTS,
  RETRIEVE_CHUNKS,
  VECTOR_SEARCH_CANDIDATES,
} from "./ai/types";
import {
  checkShareAccess,
  getDocumentIdsInFolderTree,
  getSharedDocumentIds,
} from "./share.service";

async function assertChatDailyLimit(userId: Types.ObjectId): Promise<void> {
  const limit = loadEnv().CHAT_DAILY_LIMIT_PER_USER;
  if (limit === 0) return;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const sessionIds = await ChatSession.find({ userId }).distinct("_id");
  if (sessionIds.length === 0) return;

  const count = await ChatMessage.countDocuments({
    sessionId: { $in: sessionIds },
    role: "user",
    createdAt: { $gte: startOfDay },
  });

  if (count >= limit) {
    throw createAppError(ErrorCode.CHAT_DAILY_LIMIT, 429, {
      message: `Đã hết lượt chat hôm nay (${limit} tin/ngày). Vui lòng thử lại vào ngày mai.`,
    });
  }
}

const GENERIC_SESSION_TITLES = new Set([
  "New conversation",
  "Hỏi về tài liệu",
  "Hỏi về folder",
]);

type SessionLike = {
  contextType: string;
  contextId?: Types.ObjectId | null;
  contextIds?: Types.ObjectId[];
};

async function resolveContextLabels(
  sessions: SessionLike[],
): Promise<Map<string, string>> {
  const docIds: Types.ObjectId[] = [];
  const folderIds: Types.ObjectId[] = [];

  for (const s of sessions) {
    if (s.contextType === "document" && s.contextId) docIds.push(s.contextId);
    else if (s.contextType === "folder" && s.contextId) folderIds.push(s.contextId);
    else if (s.contextType === "documents" && s.contextIds?.length) {
      docIds.push(...s.contextIds);
    }
  }

  const labelMap = new Map<string, string>();

  if (docIds.length > 0) {
    const docs = await Document.find({ _id: { $in: docIds } })
      .select("_id title originalFilename deletedAt")
      .lean();
    for (const d of docs) {
      const name = d.title?.trim() || d.originalFilename?.trim() || "Tài liệu";
      const label = d.deletedAt ? `${name} (đã xóa)` : name;
      labelMap.set(d._id.toString(), label);
    }
  }

  if (folderIds.length > 0) {
    const folders = await Folder.find({ _id: { $in: folderIds } })
      .select("_id name deletedAt")
      .lean();
    for (const f of folders) {
      const label = f.deletedAt ? `${f.name} (đã xóa)` : f.name;
      labelMap.set(f._id.toString(), label);
    }
  }

  return labelMap;
}

type ContextDeletionInfo = {
  deletedDocIds: Set<string>;
  missingDocIds: Set<string>;
  deletedFolderIds: Set<string>;
  missingFolderIds: Set<string>;
};

async function resolveContextDeletionInfo(
  sessions: SessionLike[],
): Promise<ContextDeletionInfo> {
  const docIds: Types.ObjectId[] = [];
  const folderIds: Types.ObjectId[] = [];

  for (const s of sessions) {
    if (s.contextType === "document" && s.contextId) docIds.push(s.contextId);
    else if (s.contextType === "folder" && s.contextId) folderIds.push(s.contextId);
    else if (s.contextType === "documents" && s.contextIds?.length) {
      docIds.push(...s.contextIds);
    }
  }

  const deletedDocIds = new Set<string>();
  const missingDocIds = new Set<string>();
  const deletedFolderIds = new Set<string>();
  const missingFolderIds = new Set<string>();

  if (docIds.length > 0) {
    const requestedDocIds = new Set(docIds.map((id) => id.toString()));
    const docs = await Document.find({ _id: { $in: docIds } })
      .select("_id deletedAt")
      .lean();
    const foundDocIds = new Set<string>();
    for (const d of docs) {
      const id = d._id.toString();
      foundDocIds.add(id);
      if (d.deletedAt) deletedDocIds.add(id);
    }
    for (const id of requestedDocIds) {
      if (!foundDocIds.has(id)) missingDocIds.add(id);
    }
  }

  if (folderIds.length > 0) {
    const requestedFolderIds = new Set(folderIds.map((id) => id.toString()));
    const folders = await Folder.find({ _id: { $in: folderIds } })
      .select("_id deletedAt")
      .lean();
    const foundFolderIds = new Set<string>();
    for (const f of folders) {
      const id = f._id.toString();
      foundFolderIds.add(id);
      if (f.deletedAt) deletedFolderIds.add(id);
    }
    for (const id of requestedFolderIds) {
      if (!foundFolderIds.has(id)) missingFolderIds.add(id);
    }
  }

  return { deletedDocIds, missingDocIds, deletedFolderIds, missingFolderIds };
}

function isSessionContextUnavailable(
  session: SessionLike,
  info: ContextDeletionInfo,
): boolean {
  if (session.contextType === "all") return false;

  if (session.contextType === "folder" && session.contextId) {
    const id = session.contextId.toString();
    return info.deletedFolderIds.has(id) || info.missingFolderIds.has(id);
  }

  if (session.contextType === "document" && session.contextId) {
    const id = session.contextId.toString();
    return info.deletedDocIds.has(id) || info.missingDocIds.has(id);
  }

  if (session.contextType === "documents" && session.contextIds?.length) {
    return session.contextIds.every((contextId) => {
      const id = contextId.toString();
      return info.deletedDocIds.has(id) || info.missingDocIds.has(id);
    });
  }

  return false;
}

async function assertSessionContextAvailable(session: SessionLike): Promise<void> {
  const deletionInfo = await resolveContextDeletionInfo([session]);
  if (isSessionContextUnavailable(session, deletionInfo)) {
    throw createAppError(ErrorCode.CHAT_ACCESS_DENIED, 404, {
      message: "Ngữ cảnh trò chuyện không còn khả dụng.",
    });
  }
}

type SessionWithId = SessionLike & { _id: Types.ObjectId };

async function enrichContextLabelsFromCitations(
  sessions: SessionWithId[],
  labelMap: Map<string, string>,
): Promise<void> {
  const sessionsNeedingEnrichment = sessions.filter((s) => {
    if (s.contextType === "document" && s.contextId) {
      return !labelMap.has(s.contextId.toString());
    }
    if (s.contextType === "documents" && s.contextIds?.length) {
      return s.contextIds.some((id) => !labelMap.has(id.toString()));
    }
    return false;
  });
  if (sessionsNeedingEnrichment.length === 0) return;

  const sessionIds = sessionsNeedingEnrichment.map((s) => s._id);
  const messages = await ChatMessage.find({
    sessionId: { $in: sessionIds },
    "citations.0": { $exists: true },
  })
    .select("sessionId citations")
    .sort({ createdAt: -1 })
    .lean();

  for (const s of sessionsNeedingEnrichment) {
    const targetIds = new Set<string>();
    if (s.contextType === "document" && s.contextId) {
      targetIds.add(s.contextId.toString());
    } else if (s.contextType === "documents" && s.contextIds?.length) {
      for (const id of s.contextIds) {
        const idStr = id.toString();
        if (!labelMap.has(idStr)) targetIds.add(idStr);
      }
    }

    for (const msg of messages) {
      if (msg.sessionId.toString() !== s._id.toString()) continue;
      for (const c of msg.citations) {
        const docId = c.documentId.toString();
        if (targetIds.has(docId) && c.documentTitle) {
          labelMap.set(docId, c.documentTitle);
        }
      }
    }
  }
}

function displayTitle(title: string, contextLabel: string | null): string {
  if (contextLabel && GENERIC_SESSION_TITLES.has(title)) return contextLabel;
  return title;
}

function contextLabelFromMessages(
  contextType: string,
  contextId: Types.ObjectId | null | undefined,
  messages: Array<{
    citations: Array<{ documentId: Types.ObjectId; documentTitle: string }>;
  }>,
): string | null {
  if (contextType !== "document" || !contextId) return null;
  const contextIdStr = contextId.toString();
  for (const msg of messages) {
    const hit = msg.citations.find((c) => c.documentId.toString() === contextIdStr);
    if (hit?.documentTitle) return hit.documentTitle;
  }
  return null;
}

function formatDocumentsLabel(
  contextIds: Types.ObjectId[],
  labelMap: Map<string, string>,
): string | null {
  if (contextIds.length === 0) return null;
  const titles = contextIds
    .map((id) => labelMap.get(id.toString()))
    .filter((t): t is string => !!t);
  if (titles.length === 0) return null;
  if (titles.length === 1) return titles[0]!;
  return `${titles[0]!} + ${titles.length - 1} tài liệu`;
}

function getContextLabel(
  session: SessionLike,
  labelMap: Map<string, string>,
): string | null {
  if (session.contextType === "all") return null;
  if (session.contextType === "documents" && session.contextIds?.length) {
    return formatDocumentsLabel(session.contextIds, labelMap);
  }
  if (!session.contextId) return null;
  return labelMap.get(session.contextId.toString()) ?? null;
}

function getContextDocuments(
  session: SessionLike,
  labelMap: Map<string, string>,
): Array<{ id: string; title: string }> {
  if (session.contextType === "documents" && session.contextIds?.length) {
    return session.contextIds.map((id) => {
      const idStr = id.toString();
      return {
        id: idStr,
        title: labelMap.get(idStr) ?? "Tài liệu không còn tồn tại",
      };
    });
  }
  if (session.contextType === "document" && session.contextId) {
    const idStr = session.contextId.toString();
    return [
      {
        id: idStr,
        title: labelMap.get(idStr) ?? "Tài liệu không còn tồn tại",
      },
    ];
  }
  return [];
}

function withContextFields<T extends SessionLike>(
  session: T,
  labelMap: Map<string, string>,
  title: string,
) {
  const contextLabel = getContextLabel(session, labelMap);
  return {
    contextLabel,
    contextDocuments: getContextDocuments(session, labelMap),
    title: displayTitle(title, contextLabel),
  };
}

async function resolveDefaultTitle(
  contextType: "all" | "folder" | "document" | "documents",
  contextId: Types.ObjectId | null,
  contextIds: Types.ObjectId[],
  labelMap?: Map<string, string>,
): Promise<string> {
  if (contextType === "document" && contextId) {
    const doc = await Document.findById(contextId).select("title").lean();
    if (doc) return doc.title;
  }
  if (contextType === "documents" && contextIds.length > 0) {
    if (labelMap) {
      const label = formatDocumentsLabel(contextIds, labelMap);
      if (label) return label;
    }
    const docs = await Document.find({ _id: { $in: contextIds } })
      .select("title")
      .lean();
    if (docs.length === 1) return docs[0]!.title;
    if (docs.length > 1) return `${docs[0]!.title} + ${docs.length - 1} tài liệu`;
  }
  if (contextType === "folder" && contextId) {
    const folder = await Folder.findById(contextId).select("name").lean();
    if (folder) return folder.name;
  }
  return "New conversation";
}

async function findSession(sessionId: Types.ObjectId, userId: Types.ObjectId) {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) {
    throw createAppError(ErrorCode.CHAT_SESSION_NOT_FOUND, 404);
  }
  return session;
}

async function assertContextAccess(
  user: UserDocument,
  contextType: "folder" | "document",
  contextId: Types.ObjectId,
): Promise<void> {
  if (contextType === "folder") {
    const owned = await Folder.findOne({ _id: contextId, ownerId: user._id, deletedAt: null });
    if (owned) return;
    const hasShare = await checkShareAccess(user._id, "folder", contextId);
    if (!hasShare) throw createAppError(ErrorCode.CHAT_ACCESS_DENIED, 404);
  } else {
    const owned = await Document.findOne({ _id: contextId, ownerId: user._id, deletedAt: null });
    if (owned) return;
    const publicDocument = await Document.exists({
      _id: contextId,
      visibility: "public",
      courseSlotId: { $ne: null },
      status: { $ne: "pending" },
      deletedAt: null,
    });
    if (publicDocument) return;
    const hasShare = await checkShareAccess(user._id, "document", contextId);
    if (!hasShare) throw createAppError(ErrorCode.CHAT_ACCESS_DENIED, 404);
  }
}

async function assertDocumentsAccess(
  user: UserDocument,
  contextIds: Types.ObjectId[],
): Promise<void> {
  for (const contextId of contextIds) {
    await assertContextAccess(user, "document", contextId);
  }
}

async function buildVectorSearchFilter(
  user: UserDocument,
  contextType: string,
  contextId: Types.ObjectId | null,
  contextIds: Types.ObjectId[] = [],
): Promise<Record<string, unknown>> {
  if (contextType === "document" && contextId) {
    return { documentId: contextId };
  }

  if (contextType === "documents" && contextIds.length > 0) {
    return { documentId: { $in: contextIds } };
  }

  if (contextType === "folder" && contextId) {
    const ids = await getDocumentIdsInFolderTree(contextId);
    return { documentId: { $in: ids } };
  }

  const [sharedDocIds, publicDocIds] = await Promise.all([
    getSharedDocumentIds(user._id),
    Document.find({
      visibility: "public",
      courseSlotId: { $ne: null },
      deletedAt: null,
      status: { $ne: "pending" },
    }).distinct("_id"),
  ]);

  const readableDocIds = [...sharedDocIds, ...publicDocIds];
  if (readableDocIds.length > 0) {
    return {
      $or: [{ ownerId: user._id }, { documentId: { $in: readableDocIds } }],
    };
  }

  return { ownerId: user._id };
}

export async function createSession(
  user: UserDocument,
  input: { title?: string; contextType: string; contextId?: string; contextIds?: string[] },
) {
  const contextType = (input.contextType ?? "all") as
    | "all"
    | "folder"
    | "document"
    | "documents";

  let contextId: Types.ObjectId | null = null;
  let contextIds: Types.ObjectId[] = [];

  if (contextType === "folder" || contextType === "document") {
    if (!input.contextId) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
        technicalDetail: "contextId is required when contextType is folder or document",
      });
    }
    contextId = parseObjectId(input.contextId, "contextId");
    await assertContextAccess(user, contextType, contextId);
  } else if (contextType === "documents") {
    if (!input.contextIds?.length) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
        technicalDetail: "contextIds is required when contextType is documents",
      });
    }
    contextIds = input.contextIds.map((id) => parseObjectId(id, "contextIds"));
    await assertDocumentsAccess(user, contextIds);
  }

  const labelMap = await resolveContextLabels([{ contextType, contextId, contextIds }]);

  let title = input.title?.trim();
  if (!title || GENERIC_SESSION_TITLES.has(title)) {
    title = await resolveDefaultTitle(contextType, contextId, contextIds, labelMap);
  }

  const session = await ChatSession.create({
    userId: user._id,
    title,
    contextType,
    contextId,
    contextIds,
  });

  return {
    ...toChatSessionResponse(session),
    ...withContextFields(session, labelMap, session.title),
  };
}

export async function listSessions(user: UserDocument) {
  const sessions = await ChatSession.find({ userId: user._id })
    .sort({ isPinned: -1, pinnedAt: -1, updatedAt: -1 })
    .lean();

  const deletionInfo = await resolveContextDeletionInfo(sessions);
  const visibleSessions = sessions.filter(
    (s) => !isSessionContextUnavailable(s, deletionInfo),
  );

  const labelMap = await resolveContextLabels(visibleSessions);
  await enrichContextLabelsFromCitations(visibleSessions, labelMap);

  return visibleSessions.map((s) => {
    const ctx = withContextFields(s, labelMap, s.title);
    return {
      id: s._id.toString(),
      userId: s.userId.toString(),
      title: ctx.title,
      contextType: s.contextType as string,
      contextId: s.contextId ? s.contextId.toString() : null,
      contextIds: (s.contextIds ?? []).map((id) => id.toString()),
      contextLabel: ctx.contextLabel,
      contextDocuments: ctx.contextDocuments,
      isPinned: s.isPinned ?? false,
      pinnedAt: s.pinnedAt ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });
}

export async function getSession(user: UserDocument, sessionId: string) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);
  await assertSessionContextAvailable(session);

  const messages = await ChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .lean();

  const labelMap = await resolveContextLabels([session]);
  await enrichContextLabelsFromCitations([session], labelMap);

  let contextLabel = getContextLabel(session, labelMap);
  if (!contextLabel) {
    contextLabel = contextLabelFromMessages(
      session.contextType as string,
      session.contextId as Types.ObjectId | null,
      messages,
    );
  }

  if (session.contextType === "documents" && session.contextIds?.length) {
    for (const msg of messages) {
      for (const c of msg.citations) {
        const idStr = c.documentId.toString();
        if (!labelMap.has(idStr)) {
          labelMap.set(idStr, c.documentTitle);
        }
      }
    }
  }

  const ctx = withContextFields(session, labelMap, session.title);

  return {
    ...toChatSessionResponse(session),
    title: displayTitle(session.title, contextLabel ?? ctx.contextLabel),
    contextLabel: contextLabel ?? ctx.contextLabel,
    contextDocuments: ctx.contextDocuments,
    messages: messages.map((m) => ({
      id: m._id.toString(),
      sessionId: m.sessionId.toString(),
      role: m.role,
      content: m.content,
      citations: m.citations.map((c) => ({
        sourceIndex: c.sourceIndex ?? 1,
        documentId: c.documentId.toString(),
        documentTitle: c.documentTitle,
        chunkIndex: c.chunkIndex ?? null,
        pageNumber: c.pageNumber ?? null,
        sectionPath: c.sectionPath ?? [],
        heading: c.heading ?? null,
        blockType: c.blockType ?? "paragraph",
        extractionMode: c.extractionMode ?? "text",
        extractionConfidence: c.extractionConfidence ?? "medium",
        excerpt: c.excerpt,
        deepLink: buildCitationDeepLink({
          documentId: c.documentId.toString(),
          pageNumber: c.pageNumber ?? null,
          chunkIndex: c.chunkIndex ?? null,
        }),
      })),
      suggestedQuestions: m.suggestedQuestions ?? [],
      createdAt: m.createdAt,
    })),
  };
}

export async function updateSession(
  user: UserDocument,
  sessionId: string,
  input: { title?: string; isPinned?: boolean },
) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);

  if (input.title !== undefined) {
    session.title = input.title.trim();
  }
  if (input.isPinned !== undefined) {
    session.isPinned = input.isPinned;
    session.pinnedAt = input.isPinned ? new Date() : null;
  }
  await session.save();

  const labelMap = await resolveContextLabels([session]);
  const ctx = withContextFields(session, labelMap, session.title);
  return {
    ...toChatSessionResponse(session),
    contextLabel: ctx.contextLabel,
    contextDocuments: ctx.contextDocuments,
  };
}

export async function deleteSession(user: UserDocument, sessionId: string) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);
  await ChatMessage.deleteMany({ sessionId: session._id });
  await session.deleteOne();
}

function dedupeChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  const result: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.documentId.toString()}:${chunk.chunkIndex ?? chunk.pageNumber ?? "n"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(chunk);
  }

  return result;
}

async function expandChunksWithNeighbors(
  chunks: RetrievedChunk[],
): Promise<RetrievedChunk[]> {
  if (NEIGHBOR_WINDOW <= 0) return chunks;

  return Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.chunkIndex === undefined) return chunk;

      const neighbors = await DocumentChunk.find({
        documentId: chunk.documentId,
        chunkIndex: {
          $gte: chunk.chunkIndex - NEIGHBOR_WINDOW,
          $lte: chunk.chunkIndex + NEIGHBOR_WINDOW,
        },
      })
        .sort({ chunkIndex: 1 })
        .select("content chunkIndex")
        .lean();

      if (neighbors.length <= 1) return chunk;

      const mergedContent = neighbors.map((n) => n.content).join("\n");
      return {
        ...chunk,
        content: mergedContent,
        citationExcerpt: chunk.content,
      };
    }),
  );
}

function buildContextText(
  chunks: RetrievedChunk[],
  titleMap: Map<string, string>,
): string {
  const maxChars = CONTEXT_CHUNK_MAX_CHARS * (2 * NEIGHBOR_WINDOW + 1);
  const parts = chunks.map((chunk, i) => {
    const title = titleMap.get(chunk.documentId.toString()) ?? "Unknown";
    const pageSuffix = chunk.pageNumber ? `, page ${chunk.pageNumber}` : "";
    const sectionSuffix =
      chunk.sectionPath.length > 0 ? `, section ${chunk.sectionPath.join(".")}` : "";
    const headingLine = chunk.displayHeading ? `\nHeading: ${chunk.displayHeading}` : "";
    const body =
      chunk.content.length > maxChars ? `${chunk.content.slice(0, maxChars)}…` : chunk.content;
    return `[Source ${i + 1}: ${title}${pageSuffix}${sectionSuffix}]${headingLine}\n${body}`;
  });

  return parts.join("\n\n---\n\n");
}

function mapVectorChunk(c: Record<string, unknown>): RetrievedChunk {
  const chunk: RetrievedChunk = {
    documentId: c.documentId as Types.ObjectId,
    content: c.content as string,
    queryText: String(c.queryText ?? "").toLowerCase(),
    pageNumber: (c.pageNumber as number | null) ?? null,
    score: c.score as number,
    vectorScore: c.score as number,
    sectionPath: (c.sectionPath as string[] | undefined) ?? [],
    displayHeading: (c.displayHeading as string | null | undefined) ?? null,
    blockType: String(c.blockType ?? "paragraph"),
    extractionMode: String(c.extractionMode ?? "text"),
    extractionConfidence: String(c.extractionConfidence ?? "medium"),
  };
  if (typeof c.chunkIndex === "number") {
    chunk.chunkIndex = c.chunkIndex;
  }
  return chunk;
}

async function findVectorChunks(
  query: string,
  vectorSearchFilter: Record<string, unknown>,
): Promise<RetrievedChunk[]> {
  const queryVector = await aiService.embedText(query, "search_query");
  const rawChunks = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vector_index",
        path: "embedding",
        queryVector,
        filter: vectorSearchFilter,
        numCandidates: VECTOR_SEARCH_CANDIDATES,
        limit: RETRIEVE_CHUNKS,
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

  return rawChunks.map((c) => mapVectorChunk(c));
}

function evaluateEvidenceGate(
  chunks: RetrievedChunk[],
  mode: ChatMode,
): RetrievalDebugInfo["evidenceGate"] {
  if (chunks.length === 0) {
    return {
      passed: false,
      reason: "no_retrieved_context",
    };
  }

  if (mode !== "chat") {
    return { passed: true, reason: null };
  }

  const best = chunks[0];
  const bestScore = best ? best.hybridScore ?? best.score : 0;
  const hasStrongSignal = chunks.some(
    (chunk) =>
      (chunk.rerankScore ?? 0) >= 6 ||
      (chunk.lexicalScore ?? 0) >= 2 ||
      ((chunk.vectorScore ?? 0) >= MIN_CHUNK_SCORE &&
        (chunk.hybridScore ?? chunk.score) >= 0.7 &&
        chunk.lexicalScore !== undefined),
  );

  if (!hasStrongSignal || bestScore < 0.45) {
    return {
      passed: false,
      reason: "weak_retrieval_signal",
    };
  }

  return { passed: true, reason: null };
}

function mapChatError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);

  if (
    msg.includes("finishReason=RECITATION") ||
    msg.includes("finishReason=SAFETY") ||
    msg.includes("finishReason=OTHER")
  ) {
    throw createAppError(ErrorCode.CHAT_ANSWER_BLOCKED, 422, { technicalDetail: msg });
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded")) {
    throw createAppError(ErrorCode.CHAT_QUOTA_GEMINI, 429, { technicalDetail: msg });
  }
  if (msg.includes("API key") || msg.includes("403")) {
    throw createAppError(ErrorCode.CHAT_AI_UNAVAILABLE, 503, { technicalDetail: msg });
  }
  if (msg.includes("404") || msg.includes("not found")) {
    throw createAppError(ErrorCode.CHAT_AI_UNAVAILABLE, 500, { technicalDetail: msg });
  }
  throw createAppError(ErrorCode.CHAT_AI_UNAVAILABLE, 500, { technicalDetail: msg });
}

interface PreparedChatContext {
  session: ChatSessionDocument;
  userMessage: ChatMessageDocument;
  chunkResults: RetrievedChunk[];
  titleMap: Map<string, string>;
  contextText: string;
  systemPrompt: string;
  historyMessages: ChatTurn[];
  retrievalDebug: RetrievalDebugInfo;
}

async function prepareChatContext(
  user: UserDocument,
  sessionId: Types.ObjectId,
  content: string,
  mode: ChatMode,
): Promise<PreparedChatContext> {
  const session = await findSession(sessionId, user._id);
  await assertSessionContextAvailable(session);

  await assertChatDailyLimit(user._id);

  const userMessage = await ChatMessage.create({
    sessionId: session._id,
    role: "user",
    content,
  });

  const history = await ChatMessage.find({ sessionId: session._id, _id: { $ne: userMessage._id } })
    .sort({ createdAt: -1 })
    .limit(HISTORY_MESSAGES)
    .lean();
  history.reverse();

  const priorTurns: ChatTurn[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const retrievalQuery =
    mode === "chat" ? await rewriteQueryWithHistory(content, priorTurns) : content;

  const contextId = session.contextId ? (session.contextId as Types.ObjectId) : null;
  const contextIds = (session.contextIds ?? []) as Types.ObjectId[];
  const vectorSearchFilter = await buildVectorSearchFilter(
    user,
    session.contextType as string,
    contextId,
    contextIds,
  );

  const { chunks: primaryLexicalChunks, analysis } = await findLexicalChunks(
    vectorSearchFilter,
    retrievalQuery,
  );
  const keywordQuery = buildKeywordQuery(retrievalQuery, analysis);
  const queryVariants = uniqueQueryVariants(
    [
      content,
      retrievalQuery,
      keywordQuery,
      mode !== "chat" ? `${PRESET_DEFAULT_CONTENT[mode]} ${keywordQuery}` : "",
    ],
    QUERY_VARIANTS,
  );

  const [vectorChunkGroups, lexicalChunkGroups, coverageChunks] = await Promise.all([
    Promise.all(queryVariants.map((query) => findVectorChunks(query, vectorSearchFilter))),
    Promise.all(
      queryVariants
        .filter((query) => query !== retrievalQuery)
        .map((query) => findLexicalChunks(vectorSearchFilter, query)),
    ),
    mode === "chat"
      ? Promise.resolve([])
      : findCoverageChunks(vectorSearchFilter, COVERAGE_CHUNKS),
  ]);

  const vectorChunks = vectorChunkGroups.flat();
  const lexicalChunks = [
    ...primaryLexicalChunks,
    ...lexicalChunkGroups.flatMap((result) => result.chunks),
  ];
  const combined = scoreRetrievedChunks(
    mergeRetrievedChunks(vectorChunks, [...lexicalChunks, ...coverageChunks]),
    analysis,
  );
  // Vector and lexical scores are on different scales (see mergeRetrievedChunks) — a
  // chunk should survive if it clears the vector threshold OR was found lexically at
  // all (the lexical pool is small and precision-oriented, so it doesn't need the
  // same cutoff as the 36-candidate vector pool).
  const aboveThreshold = combined.filter(
    (chunk) =>
      (chunk.vectorScore ?? 0) >= MIN_CHUNK_SCORE ||
      chunk.lexicalScore !== undefined ||
      mode !== "chat",
  );
  const chunksForContext = aboveThreshold.length > 0 ? aboveThreshold : combined;

  const reranked = await rerankChunks(
    retrievalQuery,
    chunksForContext,
    Math.min(CONTEXT_CHUNKS * 2, chunksForContext.length),
  );
  const rerankedWithScores = scoreRetrievedChunks(reranked, analysis);
  const deduped = selectDiverseChunks(dedupeChunks(rerankedWithScores), CONTEXT_CHUNKS);
  const evidenceGate = evaluateEvidenceGate(deduped, mode);
  const retrievedChunkResults = await expandChunksWithNeighbors(deduped);
  const chunkResults = evidenceGate.passed ? retrievedChunkResults : [];

  const docIds = [...new Set(chunkResults.map((c) => c.documentId.toString()))];
  const docs = await Document.find({ _id: { $in: docIds } }).select("_id title").lean();
  const titleMap = new Map(docs.map((d) => [d._id.toString(), d.title]));

  const contextText = evidenceGate.passed ? buildContextText(chunkResults, titleMap) : "";
  const systemPrompt = buildChatSystemPrompt(contextText, mode, content, analysis);

  const historyMessages: ChatTurn[] = [...priorTurns, { role: "user", content }];

  return {
    session,
    userMessage,
    chunkResults,
    titleMap,
    contextText,
    systemPrompt,
    historyMessages,
    retrievalDebug: buildRetrievalDebugInfo(
      analysis,
      queryVariants,
      vectorChunks,
      lexicalChunks,
      retrievedChunkResults,
      evidenceGate,
    ),
  };
}

function writeSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const SUGGESTED_QUESTION_COUNT = 3;
const SUGGESTED_QUESTION_MAX_CHARS = 160;
const SUGGESTED_QUESTION_CONTEXT_CHARS = 6000;
const SUGGESTED_QUESTION_ANSWER_CHARS = 2500;

function suggestedQuestionCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = record.suggestedQuestions ?? record.questions;
  return Array.isArray(candidates) ? candidates : [];
}

function sanitizeSuggestedQuestions(payload: unknown): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of suggestedQuestionCandidates(payload)) {
    if (typeof candidate !== "string") continue;

    const question = candidate
      .replace(/\s+/g, " ")
      .replace(/^[-*]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();

    if (!question || question.length > SUGGESTED_QUESTION_MAX_CHARS) continue;

    const key = question.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(question);

    if (result.length >= SUGGESTED_QUESTION_COUNT) break;
  }

  return result;
}

function buildSuggestedQuestionsPrompt(
  userQuestion: string,
  assistantAnswer: string,
  contextText: string,
): string {
  return `Create 2-3 concise follow-up questions the student can ask next.

Rules:
- Use only the retrieved context, the user's question, and the assistant answer below.
- Do not introduce facts or topics not supported by the context.
- Write questions in the same language as the user's question.
- Make each question specific, useful, and suitable for a clickable suggestion chip.
- Return JSON only: {"suggestedQuestions":["..."]}.

User question:
${userQuestion}

Assistant answer:
${assistantAnswer.slice(0, SUGGESTED_QUESTION_ANSWER_CHARS)}

Retrieved context:
${contextText.slice(0, SUGGESTED_QUESTION_CONTEXT_CHARS)}`;
}

async function generateSuggestedQuestions(
  prepared: PreparedChatContext,
  assistantAnswer: string,
  mode: ChatMode,
): Promise<string[]> {
  if (mode !== "chat" || prepared.contextText.trim().length === 0) {
    return [];
  }

  try {
    const raw = await aiService.generateLite(
      buildSuggestedQuestionsPrompt(
        prepared.userMessage.content,
        assistantAnswer,
        prepared.contextText,
      ),
      { json: true, maxOutputTokens: 256 },
    );
    return sanitizeSuggestedQuestions(JSON.parse(raw));
  } catch (error) {
    console.warn(
      "[chat] Failed to generate suggested questions:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function sendMessage(
  user: UserDocument,
  sessionId: string,
  content: string,
  mode: ChatMode = "chat",
  options?: { debug?: boolean },
) {
  const id = parseObjectId(sessionId);
  const messageContent = mode === "chat" ? content : (content.trim() || PRESET_DEFAULT_CONTENT[mode]);

  const prepared = await prepareChatContext(user, id, messageContent, mode);

  let assistantText: string;
  try {
    assistantText = await aiService.chatWithContext(prepared.systemPrompt, prepared.historyMessages);
  } catch (error) {
    mapChatError(error);
  }

  assistantText = normalizeCitationMarkers(assistantText, prepared.chunkResults);

  const builtCitations = buildCitationsFromResponse(
    assistantText,
    prepared.chunkResults,
    prepared.titleMap,
  );
  const suggestedQuestions = await generateSuggestedQuestions(prepared, assistantText, mode);

  const assistantMessage = await ChatMessage.create({
    sessionId: prepared.session._id,
    role: "assistant",
    content: assistantText,
    citations: builtCitations,
    suggestedQuestions,
  });

  await ChatSession.findByIdAndUpdate(prepared.session._id, { updatedAt: new Date() });

  return {
    userMessage: toChatMessageResponse(prepared.userMessage),
    assistantMessage: toChatMessageResponse(assistantMessage),
    ...(options?.debug ? { debug: prepared.retrievalDebug } : {}),
  };
}

export async function sendMessageStream(
  user: UserDocument,
  sessionId: string,
  content: string,
  mode: ChatMode,
  res: Response,
  options?: { debug?: boolean },
): Promise<void> {
  const id = parseObjectId(sessionId);
  const messageContent = mode === "chat" ? content : (content.trim() || PRESET_DEFAULT_CONTENT[mode]);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let prepared: PreparedChatContext;

  try {
    prepared = await prepareChatContext(user, id, messageContent, mode);
    writeSse(res, "user_message", toChatMessageResponse(prepared.userMessage));
    if (options?.debug) {
      writeSse(res, "debug", prepared.retrievalDebug);
    }
  } catch (error) {
    writeSse(res, "error", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.end();
    return;
  }

  let assistantText = "";

  try {
    for await (const delta of aiService.chatWithContextStream(
      prepared.systemPrompt,
      prepared.historyMessages,
    )) {
      assistantText += delta;
      writeSse(res, "chunk", { text: delta });
    }
  } catch (error) {
    writeSse(res, "error", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.end();
    return;
  }

  assistantText = normalizeCitationMarkers(assistantText.trim(), prepared.chunkResults);

  const builtCitations = buildCitationsFromResponse(
    assistantText,
    prepared.chunkResults,
    prepared.titleMap,
  );
  const suggestedQuestions = await generateSuggestedQuestions(
    prepared,
    assistantText.trim(),
    mode,
  );

  try {
    const assistantMessage = await ChatMessage.create({
      sessionId: prepared.session._id,
      role: "assistant",
      content: assistantText,
      citations: builtCitations,
      suggestedQuestions,
    });

    await ChatSession.findByIdAndUpdate(prepared.session._id, { updatedAt: new Date() });

    writeSse(res, "done", {
      userMessage: toChatMessageResponse(prepared.userMessage),
      assistantMessage: toChatMessageResponse(assistantMessage),
      ...(options?.debug ? { debug: prepared.retrievalDebug } : {}),
    });
  } catch (error) {
    writeSse(res, "error", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  res.end();
}
