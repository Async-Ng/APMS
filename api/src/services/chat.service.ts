import type { Response } from "express";
import type { Types } from "mongoose";
import type { UserDocument } from "../models/user.model";

import { loadEnv } from "../config/env";
import { createAppError, ErrorCode } from "../errors/error-codes";
import { ChatMessage, toChatMessageResponse, type ChatMessageDocument } from "../models/chat-message.model";
import { ChatSession, toChatSessionResponse, type ChatSessionDocument } from "../models/chat-session.model";
import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { parseObjectId } from "../utils/objectId";
import * as aiService from "./ai/ai.service";
import { buildCitationsFromResponse, type RetrievedChunk } from "./ai/citation-utils";
import {
  buildChatSystemPrompt,
  type ChatMode,
  PRESET_DEFAULT_CONTENT,
} from "./ai/chat-prompts";
import type { ChatTurn } from "./ai/types";
import {
  CONTEXT_CHUNKS,
  CONTEXT_CHUNK_MAX_CHARS,
  HISTORY_MESSAGES,
  MIN_CHUNK_SCORE,
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
    const hit = msg.citations.find(
      (c) => c.documentId.toString() === contextIdStr,
    );
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

  // scope "all": owned docs + shared docs
  const sharedDocIds = await getSharedDocumentIds(user._id);

  if (sharedDocIds.length > 0) {
    return {
      $or: [{ ownerId: user._id }, { documentId: { $in: sharedDocIds } }],
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

  const labelMap = await resolveContextLabels([
    { contextType, contextId, contextIds },
  ]);

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

  const labelMap = await resolveContextLabels(sessions);
  await enrichContextLabelsFromCitations(sessions, labelMap);

  return sessions.map((s) => {
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
        pageNumber: c.pageNumber ?? null,
        excerpt: c.excerpt,
      })),
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

function dedupeChunksByPage(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const bestByKey = new Map<string, RetrievedChunk>();

  for (const chunk of chunks) {
    const key = `${chunk.documentId.toString()}:${chunk.pageNumber ?? "n"}`;
    const existing = bestByKey.get(key);
    if (!existing || chunk.score > existing.score) {
      bestByKey.set(key, chunk);
    }
  }

  return [...bestByKey.values()].sort((a, b) => b.score - a.score);
}

function buildContextText(
  chunks: RetrievedChunk[],
  titleMap: Map<string, string>,
): string {
  const parts = chunks.map((chunk, i) => {
    const title = titleMap.get(chunk.documentId.toString()) ?? "Unknown";
    const pageSuffix = chunk.pageNumber ? `, page ${chunk.pageNumber}` : "";
    const body =
      chunk.content.length > CONTEXT_CHUNK_MAX_CHARS
        ? `${chunk.content.slice(0, CONTEXT_CHUNK_MAX_CHARS)}…`
        : chunk.content;
    return `[Source ${i + 1}: ${title}${pageSuffix}]\n${body}`;
  });

  return parts.join("\n\n---\n\n");
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
  systemPrompt: string;
  historyMessages: ChatTurn[];
}

async function prepareChatContext(
  user: UserDocument,
  sessionId: Types.ObjectId,
  content: string,
  mode: ChatMode,
): Promise<PreparedChatContext> {
  const session = await findSession(sessionId, user._id);

  await assertChatDailyLimit(user._id);

  const userMessage = await ChatMessage.create({
    sessionId: session._id,
    role: "user",
    content,
  });

  const queryVector = await aiService.embedText(content, "search_query");

  const contextId = session.contextId ? (session.contextId as unknown as Types.ObjectId) : null;
  const contextIds = (session.contextIds ?? []) as Types.ObjectId[];
  const vectorSearchFilter = await buildVectorSearchFilter(
    user,
    session.contextType as string,
    contextId,
    contextIds,
  );

  const rawChunks = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vector_index",
        path: "embedding",
        queryVector,
        filter: vectorSearchFilter,
        numCandidates: VECTOR_SEARCH_CANDIDATES,
        limit: CONTEXT_CHUNKS,
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

  const scoredChunks = rawChunks.map((c) => ({
    documentId: c.documentId as Types.ObjectId,
    content: c.content as string,
    pageNumber: (c.pageNumber as number | null) ?? null,
    score: c.score as number,
  }));

  const aboveThreshold = scoredChunks.filter((c) => c.score >= MIN_CHUNK_SCORE);
  const chunksForContext =
    aboveThreshold.length > 0 ? aboveThreshold : scoredChunks;

  const chunkResults = dedupeChunksByPage(chunksForContext).slice(0, CONTEXT_CHUNKS);

  const docIds = [...new Set(chunkResults.map((c) => c.documentId.toString()))];
  const docs = await Document.find({ _id: { $in: docIds } }).select("_id title").lean();
  const titleMap = new Map(docs.map((d) => [d._id.toString(), d.title]));

  const contextText = buildContextText(chunkResults, titleMap);
  const systemPrompt = buildChatSystemPrompt(contextText, mode, content);

  const history = await ChatMessage.find({ sessionId: session._id, _id: { $ne: userMessage._id } })
    .sort({ createdAt: -1 })
    .limit(HISTORY_MESSAGES)
    .lean();
  history.reverse();

  const historyMessages: ChatTurn[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  historyMessages.push({ role: "user", content });

  return {
    session,
    userMessage,
    chunkResults,
    titleMap,
    systemPrompt,
    historyMessages,
  };
}

function writeSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function sendMessage(
  user: UserDocument,
  sessionId: string,
  content: string,
  mode: ChatMode = "chat",
) {
  const id = parseObjectId(sessionId);
  const messageContent =
    mode === "chat" ? content : (content.trim() || PRESET_DEFAULT_CONTENT[mode]);

  const prepared = await prepareChatContext(user, id, messageContent, mode);

  let assistantText: string;
  try {
    assistantText = await aiService.chatWithContext(
      prepared.systemPrompt,
      prepared.historyMessages,
    );
  } catch (error) {
    mapChatError(error);
  }

  const builtCitations = buildCitationsFromResponse(
    assistantText,
    prepared.chunkResults,
    prepared.titleMap,
  );

  const assistantMessage = await ChatMessage.create({
    sessionId: prepared.session._id,
    role: "assistant",
    content: assistantText,
    citations: builtCitations,
  });

  await ChatSession.findByIdAndUpdate(prepared.session._id, { updatedAt: new Date() });

  return {
    userMessage: toChatMessageResponse(prepared.userMessage),
    assistantMessage: toChatMessageResponse(assistantMessage),
  };
}

export async function sendMessageStream(
  user: UserDocument,
  sessionId: string,
  content: string,
  mode: ChatMode,
  res: Response,
): Promise<void> {
  const id = parseObjectId(sessionId);
  const messageContent =
    mode === "chat" ? content : (content.trim() || PRESET_DEFAULT_CONTENT[mode]);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let prepared: PreparedChatContext;

  try {
    prepared = await prepareChatContext(user, id, messageContent, mode);
    writeSse(res, "user_message", toChatMessageResponse(prepared.userMessage));
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

  const builtCitations = buildCitationsFromResponse(
    assistantText.trim(),
    prepared.chunkResults,
    prepared.titleMap,
  );

  try {
    const assistantMessage = await ChatMessage.create({
      sessionId: prepared.session._id,
      role: "assistant",
      content: assistantText.trim(),
      citations: builtCitations,
    });

    await ChatSession.findByIdAndUpdate(prepared.session._id, { updatedAt: new Date() });

    writeSse(res, "done", {
      userMessage: toChatMessageResponse(prepared.userMessage),
      assistantMessage: toChatMessageResponse(assistantMessage),
    });
  } catch (error) {
    writeSse(res, "error", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  res.end();
}
