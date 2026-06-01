import type { Types } from "mongoose";
import type { UserDocument } from "../models/user.model";

import { AppError } from "../errors/AppError";
import { ChatMessage, toChatMessageResponse } from "../models/chat-message.model";
import { ChatSession, toChatSessionResponse } from "../models/chat-session.model";
import { DocumentChunk } from "../models/document-chunk.model";
import { Document } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { parseObjectId } from "../utils/objectId";
import * as bedrockService from "./bedrock.service";
import {
  checkShareAccess,
  getDocumentIdsInFolderTree,
  getSharedDocumentIds,
} from "./share.service";

const CONTEXT_CHUNKS = 5;
const HISTORY_MESSAGES = 10;

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

async function buildVectorSearchFilter(
  user: UserDocument,
  contextType: string,
  contextId: Types.ObjectId | null,
): Promise<Record<string, unknown>> {
  if (contextType === "document" && contextId) {
    return { documentId: contextId };
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
  input: { title?: string; contextType: string; contextId?: string },
) {
  const contextType = (input.contextType ?? "all") as "all" | "folder" | "document";

  let contextId: Types.ObjectId | null = null;

  if (contextType !== "all") {
    if (!input.contextId) {
      throw new AppError("contextId is required when contextType is folder or document", 400);
    }
    contextId = parseObjectId(input.contextId, "contextId");
    await assertContextAccess(user, contextType, contextId);
  }

  const title = input.title ?? "New conversation";

  const session = await ChatSession.create({
    userId: user._id,
    title,
    contextType,
    contextId,
  });

  return toChatSessionResponse(session);
}

export async function listSessions(user: UserDocument) {
  const sessions = await ChatSession.find({ userId: user._id })
    .sort({ updatedAt: -1 })
    .lean();

  return sessions.map((s) => ({
    id: s._id.toString(),
    userId: s.userId.toString(),
    title: s.title,
    contextType: s.contextType as string,
    contextId: s.contextId ? s.contextId.toString() : null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function getSession(user: UserDocument, sessionId: string) {
  const id = parseObjectId(sessionId);
  const session = await findSession(id, user._id);

  const messages = await ChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .lean();

  return {
    ...toChatSessionResponse(session),
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
  const queryVector = await bedrockService.embedText(content, "search_query");

  // Build vector search filter based on session scope
  const contextId = session.contextId ? (session.contextId as unknown as Types.ObjectId) : null;
  const vectorSearchFilter = await buildVectorSearchFilter(
    user,
    session.contextType as string,
    contextId,
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
    assistantText = await bedrockService.chatWithContext(systemPrompt, historyMessages);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("use case details")) {
      throw new AppError(
        "Model chat chưa được kích hoạt trên Bedrock. Vào Model catalog và bật Amazon Nova Micro.",
        503,
      );
    }
    if (msg.includes("Too many tokens") || msg.includes("ThrottlingException")) {
      throw new AppError("Đã vượt quota Bedrock. Thử lại sau vài phút.", 429);
    }
    if (msg.includes("not authorized") || msg.includes("AccessDenied")) {
      throw new AppError(
        "Không có quyền gọi model chat trên Bedrock. Chạy lại cdk deploy hoặc bật Nova Micro trong Model catalog.",
        503,
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
