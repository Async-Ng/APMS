import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const citationSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    documentTitle: { type: String, required: true },
    pageNumber: { type: Number, default: null },
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
  },
  { timestamps: true },
);

export type ChatMessageDocument = HydratedDocument<InferSchemaType<typeof chatMessageSchema>>;
export const ChatMessage = model("ChatMessage", chatMessageSchema);

export function toChatMessageResponse(message: ChatMessageDocument) {
  return {
    id: message._id.toString(),
    sessionId: message.sessionId.toString(),
    role: message.role,
    content: message.content,
    citations: message.citations.map((c) => ({
      documentId: c.documentId.toString(),
      documentTitle: c.documentTitle,
      pageNumber: c.pageNumber ?? null,
      excerpt: c.excerpt,
    })),
    createdAt: message.createdAt,
  };
}
