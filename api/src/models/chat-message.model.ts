import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const citationSchema = new Schema(
  {
    sourceIndex: { type: Number, required: true },
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    pageNumber: { type: Number, default: null },
    sectionPath: { type: [String], default: [] },
    heading: { type: String, default: null },
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
      pageNumber: c.pageNumber ?? null,
      sectionPath: c.sectionPath ?? [],
      heading: c.heading ?? null,
      excerpt: c.excerpt,
    })),
    suggestedQuestions: message.suggestedQuestions ?? [],
    createdAt: message.createdAt,
  };
}
