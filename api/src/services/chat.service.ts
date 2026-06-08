import type { Types } from "mongoose";
import type { UserDocument } from "../models/user.model";

import { AppError } from "../errors/AppError";
import { ChatMessage, toChatMessageResponse } from "../models/chat-message.model";
import { ChatSession, toChatSessionResponse } from "../models/chat-session.model";
import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { parseObjectId } from "../utils/objectId";
import * as aiService from "./ai/ai.service";
import {
  checkShareAccess,
  getDocumentIdsInFolderTree,
  getSharedDocumentIds,
} from "./share.service";

const CONTEXT_CHUNKS = 5;
const HISTORY_MESSAGES = 10;

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
      .select("_id title deletedAt")
      .lean();
    for (const d of docs) {
      const label = d.deletedAt ? `${d.title} (đã xóa)` : d.title;
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
  const missing = sessions.filter(
    (s) =>
      s.contextType === "document" &&
      s.contextId &&
      !labelMap.has(s.contextId.toString()),
  );
  if (missing.length === 0) return;

  const sessionIds = missing.map((s) => s._id);
  const messages = await ChatMessage.find({
    sessionId: { $in: sessionIds },
    "citations.0": { $exists: true },
  })
    .select("sessionId citations")
    .sort({ createdAt: -1 })
    .lean();

  for (const s of missing) {
    const contextIdStr = s.contextId!.toString();
    for (const msg of messages) {
      if (msg.sessionId.toString() !== s._id.toString()) continue;
      const hit = msg.citations.find(
        (c) => c.documentId.toString() === contextIdStr,
      );
      if (hit?.documentTitle) {
        labelMap.set(contextIdStr, hit.documentTitle);
        break;
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
    throw new AppError("Chat session not found", 404);
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
    if (!hasShare) throw new AppError("Folder not found or access denied", 404);
  } else {
    const owned = await Document.findOne({ _id: contextId, ownerId: user._id, deletedAt: null });
    if (owned) return;
    const hasShare = await checkShareAccess(user._id, "document", contextId);
    if (!hasShare) throw new AppError("Document not found or access denied", 404);
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
      throw new AppError("contextId is required when contextType is folder or document", 400);
    }
    contextId = parseObjectId(input.contextId, "contextId");
    await assertContextAccess(user, contextType, contextId);
  } else if (contextType === "documents") {
    if (!input.contextIds?.length) {
      throw new AppError("contextIds is required when contextType is documents", 400);
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
    contextLabel: getContextLabel(session, labelMap),
  };
}

export async function listSessions(user: UserDocument) {
  const sessions = await ChatSession.find({ userId: user._id })
    .sort({ updatedAt: -1 })
    .lean();

  const labelMap = await resolveContextLabels(sessions);
  await enrichContextLabelsFromCitations(sessions, labelMap);

  return sessions.map((s) => {
    const contextLabel = getContextLabel(s, labelMap);
    return {
      id: s._id.toString(),
      userId: s.userId.toString(),
      title: displayTitle(s.title, contextLabel),
      contextType: s.contextType as string,
      contextId: s.contextId ? s.contextId.toString() : null,
      contextIds: (s.contextIds ?? []).map((id) => id.toString()),
      contextLabel,
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

  return {
    ...toChatSessionResponse(session),
    title: displayTitle(session.title, contextLabel),
    contextLabel,
    messages: messages.map((m) => ({
      id: m._id.toString(),
      sessionId: m.sessionId.toString(),
      role: m.role,
      content: m.content,
      citations: m.citations.map((c) => ({
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
  input: { title: string },
) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);

  session.title = input.title.trim();
  await session.save();

  const labelMap = await resolveContextLabels([session]);
  return {
    ...toChatSessionResponse(session),
    contextLabel: getContextLabel(session, labelMap),
  };
}

export async function deleteSession(user: UserDocument, sessionId: string) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);
  await ChatMessage.deleteMany({ sessionId: session._id });
  await session.deleteOne();
}

export async function sendMessage(
  user: UserDocument,
  sessionId: string,
  content: string,
) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);

  // Save user message
  const userMessage = await ChatMessage.create({
    sessionId: session._id,
    role: "user",
    content,
  });

  // Embed the user query
  const queryVector = await aiService.embedText(content, "search_query");

  // Build vector search filter based on session scope
  const contextId = session.contextId ? (session.contextId as unknown as Types.ObjectId) : null;
  const contextIds = (session.contextIds ?? []) as Types.ObjectId[];
  const vectorSearchFilter = await buildVectorSearchFilter(
    user,
    session.contextType as string,
    contextId,
    contextIds,
  );

  // Retrieve relevant chunks via Atlas Vector Search
  const chunkResults = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_vector_index",
        path: "embedding",
        queryVector,
        filter: vectorSearchFilter,
        numCandidates: CONTEXT_CHUNKS * 10,
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

  // Gather document titles for citations
  const docIds = [...new Set(chunkResults.map((c) => c.documentId.toString()))];
  const docs = await Document.find({ _id: { $in: docIds } }).select("_id title").lean();
  const titleMap = new Map(docs.map((d) => [d._id.toString(), d.title]));

  // Build context string
  const contextParts = chunkResults.map(
    (c, i) =>
      `[Source ${i + 1}: ${titleMap.get(c.documentId.toString()) ?? "Unknown"}${c.pageNumber ? `, page ${c.pageNumber}` : ""}]\n${c.content}`,
  );
  const contextText = contextParts.join("\n\n---\n\n");

  // Fetch last N messages for conversation history (excluding the one just saved)
  const history = await ChatMessage.find({ sessionId: session._id, _id: { $ne: userMessage._id } })
    .sort({ createdAt: -1 })
    .limit(HISTORY_MESSAGES)
    .lean();
  history.reverse();

  const historyMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  historyMessages.push({ role: "user", content });

  const systemPrompt =
    contextText.length > 0
      ? `You are a helpful AI assistant. Answer the user's question using ONLY the following document excerpts as context. If the answer is not in the context, say you don't know.\n\nContext:\n${contextText}`
      : "You are a helpful AI assistant. No relevant document context was found for this question. Answer to the best of your ability or let the user know you need more documents.";

  let assistantText: string;
  try {
    assistantText = await aiService.chatWithContext(systemPrompt, historyMessages);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const usingGemini = aiService.getActiveProvider() === "gemini";
    // #region agent log
    fetch("http://127.0.0.1:7917/ingest/7c4e892b-25cc-49b0-931a-8bc2ae5d7ab8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "94cae1" },
      body: JSON.stringify({
        sessionId: "94cae1",
        hypothesisId: "H4",
        location: "chat.service.ts:sendMessage",
        message: "chatWithContext error",
        data: { usingGemini, errorMsg: msg.slice(0, 500) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (
      usingGemini &&
      (msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded"))
    ) {
      throw new AppError(
        "Đã vượt quota Gemini API (free tier). Đợi vài phút rồi thử lại, đổi GEMINI_CHAT_MODEL, hoặc bật billing tại Google AI Studio.",
        429,
      );
    }
    if (usingGemini && (msg.includes("API key") || msg.includes("403"))) {
      throw new AppError(
        "GEMINI_API_KEY không hợp lệ. Tạo key tại Google AI Studio (định dạng thường bắt đầu AIza...).",
        503,
      );
    }
    if (usingGemini && (msg.includes("404") || msg.includes("not found"))) {
      throw new AppError(
        "Model Gemini không tồn tại. Dùng GEMINI_EMBEDDING_MODEL=gemini-embedding-001 và model chat hỗ trợ generateContent.",
        500,
      );
    }

    if (!usingGemini && msg.includes("use case details")) {
      throw new AppError(
        "Model chat chưa được kích hoạt trên Bedrock. Vào Model catalog và bật Amazon Nova Micro, hoặc đặt AI_PROVIDER=gemini.",
        503,
      );
    }
    if (!usingGemini && (msg.includes("Too many tokens") || msg.includes("ThrottlingException"))) {
      throw new AppError(
        "Đã vượt quota Bedrock (Nova). Thử lại sau, tăng quota AWS, hoặc đặt GEMINI_API_KEY + AI_PROVIDER=auto để fallback.",
        429,
      );
    }
    if (!usingGemini && (msg.includes("not authorized") || msg.includes("AccessDenied"))) {
      throw new AppError(
        "Không có quyền gọi Nova trên Bedrock. Bật Nova Micro, chạy `cd infrastructure && npx cdk deploy`, hoặc dùng AI_PROVIDER=gemini.",
        503,
      );
    }
    if (!usingGemini && (msg.includes("on-demand throughput isn't supported") || msg.includes("inference profile"))) {
      throw new AppError(
        "Cấu hình model chat sai: dùng BEDROCK_MODEL_ID=apac.amazon.nova-micro-v1:0 (không dùng amazon.nova-micro-v1:0 trực tiếp).",
        500,
      );
    }
    throw error;
  }

  // Build citations from retrieved chunks
  const citations = chunkResults
    .filter((c) => titleMap.has(c.documentId.toString()))
    .map((c) => ({
      documentId: c.documentId,
      documentTitle: titleMap.get(c.documentId.toString()) ?? "",
      pageNumber: c.pageNumber ?? null,
      excerpt: (c.content as string).slice(0, 300),
    }));

  // Save assistant message
  const assistantMessage = await ChatMessage.create({
    sessionId: session._id,
    role: "assistant",
    content: assistantText,
    citations,
  });

  // Update session updatedAt
  await ChatSession.findByIdAndUpdate(session._id, { updatedAt: new Date() });

  return {
    userMessage: toChatMessageResponse(userMessage),
    assistantMessage: toChatMessageResponse(assistantMessage),
  };
}
