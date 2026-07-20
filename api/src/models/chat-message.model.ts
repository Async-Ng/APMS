import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const citationSchema = new Schema(
  {
    sourceIndex: { type: Number, required: true },
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    chunkIndex: { type: Number, default: null },
    pageNumber: { type: Number, default: null },
    sectionPath: { type: [String], default: [] },
    heading: { type: String, default: null },
    blockType: { type: String, default: "paragraph" },
    extractionMode: { type: String, default: "text" },
    extractionConfidence: { type: String, default: "medium" },
    excerpt: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    suggestedQuestions: { type: [String], default: [] },
    // True when this assistant answer replaced a previous one (regenerate).
    // Regenerations count toward the daily chat limit (BR-025).
    isRegeneration: { type: Boolean, default: false },
  },
  { timestamps: true },
);

chatMessageSchema.index({ sessionId: 1, role: 1, createdAt: -1 });

export type ChatMessageDocument = HydratedDocument<InferSchemaType<typeof chatMessageSchema>>;
export const ChatMessage = model("ChatMessage", chatMessageSchema);

export function toChatMessageResponse(message: ChatMessageDocument) {
  return {
    id: message._id.toString(),
    sessionId: message.sessionId.toString(),
    role: message.role,
    content: message.content,
    citations: message.citations.map((c) => ({
      sourceIndex: c.sourceIndex,
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
    suggestedQuestions: message.suggestedQuestions ?? [],
    createdAt: message.createdAt,
  };
}

export function buildCitationDeepLink(input: {
  documentId: string;
  pageNumber?: number | null;
  chunkIndex?: number | null;
}): string {
  const params = new URLSearchParams({ from: "chat" });
  if (input.pageNumber != null) params.set("page", String(input.pageNumber));
  if (input.chunkIndex != null) params.set("chunkIndex", String(input.chunkIndex));
  return `/documents/${input.documentId}?${params.toString()}`;
}
