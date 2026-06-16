import { objectIdParamSchema } from "../../validators/common.validator";
import { registry, z } from "../setup";
import { successEnvelope } from "../schemas/common";
import {
  bearerSecurity,
  error400,
  error401,
  error403,
  error404,
  jsonResponse,
} from "./helpers";

const citationSchema = z.object({
  documentId: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
  documentTitle: z.string().openapi({ example: "Kiến trúc Microservice" }),
  pageNumber: z.number().nullable().openapi({ example: 3 }),
  excerpt: z.string().openapi({ example: "Microservice là một kiến trúc..." }),
});

const chatSessionSchema = registry.register(
  "ChatSession",
  z
    .object({
      id: z.string(),
      userId: z.string(),
      title: z.string(),
      contextType: z.enum(["all", "folder", "document", "documents"]).openapi({
        description: "Scope of documents used as AI context",
      }),
      contextId: z.string().nullable().openapi({
        description: "Folder or document ID when contextType is folder or document",
      }),
      contextIds: z.array(z.string()).openapi({
        description: "Document IDs when contextType is documents",
      }),
      contextLabel: z.string().nullable().openapi({
        description: "Resolved document title or folder name when contextType is not 'all'",
      }),
      contextDocuments: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
          }),
        )
        .openapi({
          description: "Resolved document list when contextType is document or documents",
        }),
      isPinned: z.boolean().openapi({
        description: "Whether the session is pinned to the top of the list",
        example: false,
      }),
      pinnedAt: z.string().datetime().nullable().openapi({ example: null }),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .openapi("ChatSession"),
);

const chatMessageSchema = registry.register(
  "ChatMessage",
  z
    .object({
      id: z.string(),
      sessionId: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      citations: z.array(citationSchema),
      createdAt: z.string().datetime(),
    })
    .openapi("ChatMessage"),
);

const sessionListResponse = successEnvelope(
  registry.register("ChatSessionList", z.array(chatSessionSchema).openapi("ChatSessionList")),
  "ChatSessionList",
);

const sessionDetailResponse = successEnvelope(
  registry.register(
    "ChatSessionDetail",
    chatSessionSchema
      .extend({ messages: z.array(chatMessageSchema) })
      .openapi("ChatSessionDetail"),
  ),
  "ChatSessionDetail",
);

const sessionResponse = successEnvelope(chatSessionSchema, "ChatSession");

const sendMessageResponse = successEnvelope(
  registry.register(
    "SendMessageResult",
    z
      .object({
        userMessage: chatMessageSchema,
        assistantMessage: chatMessageSchema,
      })
      .openapi("SendMessageResult"),
  ),
  "SendMessageResult",
);

const createSessionBodySchema = z.object({
  title: z.string().max(255).optional().openapi({ example: "Hỏi về kiến trúc phần mềm" }),
  contextType: z.enum(["all", "folder", "document", "documents"]).default("all").openapi({
    description:
      "'all' = toàn bộ tài liệu, 'folder' = trong folder, 'document' = 1 tài liệu, 'documents' = nhiều tài liệu",
  }),
  contextId: z.string().optional().openapi({
    description: "Bắt buộc khi contextType là 'folder' hoặc 'document'",
    example: "507f1f77bcf86cd799439011",
  }),
  contextIds: z.array(z.string()).min(1).max(20).optional().openapi({
    description: "Bắt buộc khi contextType là 'documents'",
  }),
});

export function registerChatPaths(): void {
  // POST /api/chat/sessions
  registry.registerPath({
    method: "post",
    path: "/api/chat/sessions",
    tags: ["Chat"],
    summary: "Create a new chat session",
    description:
      "contextType controls which documents the AI uses as context:\n- `all`: owned + shared documents\n- `folder`: documents inside the specified folder\n- `document`: one specific document\n\nUser must own or have a share on the folder/document.",
    security: [...bearerSecurity],
    request: {
      body: {
        content: { "application/json": { schema: createSessionBodySchema } },
      },
    },
    responses: {
      201: jsonResponse(sessionResponse, "Session created"),
      400: error400("Validation error or contextId missing"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // GET /api/chat/sessions
  registry.registerPath({
    method: "get",
    path: "/api/chat/sessions",
    tags: ["Chat"],
    summary: "List all chat sessions",
    description: "Returns sessions with pinned sessions first, then sorted by most recently updated.",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(sessionListResponse, "Sessions list"),
      401: error401,
      403: error403,
    },
  });

  // GET /api/chat/sessions/:id
  registry.registerPath({
    method: "get",
    path: "/api/chat/sessions/{id}",
    tags: ["Chat"],
    summary: "Get session with full message history",
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: {
      200: jsonResponse(sessionDetailResponse, "Session detail with messages"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // PATCH /api/chat/sessions/:id
  registry.registerPath({
    method: "patch",
    path: "/api/chat/sessions/{id}",
    tags: ["Chat"],
    summary: "Update chat session (rename and/or pin)",
    security: [...bearerSecurity],
    request: {
      params: objectIdParamSchema,
      body: {
        content: {
          "application/json": {
            schema: z
              .object({
                title: z.string().min(1).max(255).optional().openapi({ example: "Hỏi về WDP26" }),
                isPinned: z.boolean().optional().openapi({ example: true }),
              })
              .refine((data) => data.title !== undefined || data.isPinned !== undefined, {
                message: "At least one of title or isPinned is required",
              }),
          },
        },
      },
    },
    responses: {
      200: jsonResponse(sessionResponse, "Session updated"),
      400: error400("Validation error"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // DELETE /api/chat/sessions/:id
  registry.registerPath({
    method: "delete",
    path: "/api/chat/sessions/{id}",
    tags: ["Chat"],
    summary: "Delete a chat session and all its messages",
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: {
      204: { description: "Session deleted" },
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // POST /api/chat/sessions/:id/messages
  registry.registerPath({
    method: "post",
    path: "/api/chat/sessions/{id}/messages",
    tags: ["Chat"],
    summary: "Send a message and get an AI response",
    description:
      "Runs RAG within the session's scope (all/folder/document). Embeds the message, retrieves top-5 relevant chunks, builds context prompt, calls Gemini 2.5-flash via Vertex AI, returns answer with citations.",
    security: [...bearerSecurity],
    request: {
      params: objectIdParamSchema,
      body: {
        content: {
          "application/json": {
            schema: z.object({
              content: z.string().min(1).max(10_000).openapi({ example: "Kiến trúc microservice là gì?" }),
            }),
          },
        },
      },
    },
    responses: {
      201: jsonResponse(sendMessageResponse, "User message saved and AI response generated"),
      400: error400("Missing or empty content"),
      401: error401,
      403: error403,
      404: error404,
    },
  });
}
