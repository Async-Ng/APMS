import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const CHAT_CONTEXT_TYPES = ["all", "folder", "document", "documents"] as const;
export type ChatContextType = (typeof CHAT_CONTEXT_TYPES)[number];

const chatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    contextType: {
      type: String,
      enum: CHAT_CONTEXT_TYPES,
      default: "all",
      required: true,
    },
    contextId: { type: Schema.Types.ObjectId, default: null },
    contextIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true },
);

export type ChatSessionDocument = HydratedDocument<InferSchemaType<typeof chatSessionSchema>>;
export const ChatSession = model("ChatSession", chatSessionSchema);

export function toChatSessionResponse(session: ChatSessionDocument) {
  return {
    id: session._id.toString(),
    userId: session.userId.toString(),
    title: session.title,
    contextType: session.contextType as ChatContextType,
    contextId: session.contextId ? session.contextId.toString() : null,
    contextIds: (session.contextIds ?? []).map((id) => id.toString()),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
